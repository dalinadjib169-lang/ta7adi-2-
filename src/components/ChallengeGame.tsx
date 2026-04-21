import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, X, CheckCircle2, AlertCircle, ArrowRight, Brain, Swords } from 'lucide-react';
import { Question, Challenge, UserProfile } from '../types';
import confetti from 'canvas-confetti';
import { cn, getRankFromPoints } from '../lib/utils';
import GeometryCanvas from './GeometryCanvas';
import { db, doc, updateDoc, getDoc, auth } from '../lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ChallengeGameProps {
  challenge: Challenge;
  profile: UserProfile;
  onClose: () => void;
  soundEnabled: boolean;
}

export default function ChallengeGame({ challenge, profile, onClose, soundEnabled }: ChallengeGameProps) {
  const isChallenger = profile.uid === challenge.challengerId;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(challenge.status === 'completed' ? (isChallenger ? challenge.challengerScore || 0 : challenge.challengedScore || 0) : 0);
  const [timeLeft, setTimeLeft] = useState(30); // Default to 30
  const [isGameOver, setIsGameOver] = useState(challenge.status === 'completed');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [totalTime, setTotalTime] = useState(challenge.status === 'completed' ? (isChallenger ? challenge.challengerTime || 0 : challenge.challengedTime || 0) : 0);
  const [userAnswers, setUserAnswers] = useState<string[]>(challenge.status === 'completed' ? (isChallenger ? challenge.challengerAnswers || [] : challenge.challengedAnswers || []) : []);
  const [showComparison, setShowComparison] = useState(challenge.status === 'completed');
  const [finalChallengeData, setFinalChallengeData] = useState<Challenge | null>(challenge.status === 'completed' ? challenge : null);
  const [gameStarted, setGameStarted] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    if (challenge.status === 'completed') {
      const isWinner = challenge.winnerId === profile.uid;
      setResultMessage(isWinner ? "لقد فزت بهذا التحدي!" : "لقد خسرت هذا التحدي.");
    }
  }, [challenge, profile.uid]);

  const questions = challenge.questions || [];

  useEffect(() => {
    if (questions.length > 0 && questions[currentIndex] && !isGameOver) {
      setTimeLeft(questions[currentIndex].timer);
      setQuestionStartTime(Date.now());
      setGameStarted(true);
    }
  }, [currentIndex, questions, isGameOver]);

  useEffect(() => {
    if (gameStarted && questions.length > 0 && timeLeft > 0 && !isGameOver && !feedback) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameStarted && questions.length > 0 && timeLeft === 0 && !isGameOver && !feedback) {
      handleAnswer('');
    }
  }, [timeLeft, isGameOver, feedback, questions.length, gameStarted]);

  const playSound = (type: 'correct' | 'wrong' | 'click') => {
    if (!soundEnabled) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  };

  const handleAnswer = async (option: string) => {
    if (feedback || questions.length === 0 || !questions[currentIndex]) return;
    
    const currentQ = questions[currentIndex];
    setSelectedOption(option);
    
    const normalize = (s: string) => {
      const arabicNumerals = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
      let normalized = s.replace(/\s+/g, '').trim();
      for (let i = 0; i < 10; i++) {
        normalized = normalized.replace(arabicNumerals[i], i.toString());
      }
      return normalized;
    };
    
    const isCorrect = normalize(option) === normalize(currentQ.correctAnswer);
    const duration = (Date.now() - questionStartTime) / 1000;
    setTotalTime(t => t + duration);
    
    setFeedback(isCorrect ? 'correct' : 'wrong');
    playSound(isCorrect ? 'correct' : 'wrong');
    
    setUserAnswers(prev => [...prev, option || 'لم يتم الرد']);

    if (isCorrect) {
      setScore(s => s + 1);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9333ea', '#eab308', '#22c55e']
      });
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedOption(null);
        setFeedback(null);
      } else {
        setIsGameOver(true);
        // Use the latest score and answers
        const finalScore = isCorrect ? score + 1 : score;
        const finalAnswers = [...userAnswers, option || 'لم يتم الرد'];
        completeChallenge(finalScore, finalAnswers);
      }
    }, 1500);
  };

  const completeChallenge = async (finalScore: number, finalAnswers: string[]) => {
    const challengeRef = doc(db, 'challenges', challenge.id);
    const updateData: any = {};
    
    // Ensure totalTime is accurate
    const finalTime = Number(totalTime.toFixed(2));

    if (isChallenger) {
      updateData.challengerScore = finalScore;
      updateData.challengerTime = finalTime;
      updateData.challengerLevel = currentIndex + 1;
      updateData.challengerAnswers = finalAnswers;
    } else {
      updateData.challengedScore = finalScore;
      updateData.challengedTime = finalTime;
      updateData.challengedLevel = currentIndex + 1;
      updateData.challengedAnswers = finalAnswers;
    }

    try {
      await updateDoc(challengeRef, updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `challenges/${challenge.id}`);
    }

    // Check if both finished
    try {
      const snap = await getDoc(challengeRef);
      const data = snap.data() as Challenge;
      
      if (data.challengerScore !== undefined && data.challengedScore !== undefined) {
        if (!data.pointsTransferred) {
          // Determine winner
          let winnerId = '';
          if (data.challengerScore > data.challengedScore) {
            winnerId = data.challengerId;
          } else if (data.challengedScore > data.challengerScore) {
            winnerId = data.challengedId;
          } else {
            // Tie-breaker: Time
            if (data.challengerTime! < data.challengedTime!) {
              winnerId = data.challengerId;
            } else if (data.challengedTime! < data.challengerTime!) {
              winnerId = data.challengedId;
            } else {
              winnerId = 'draw';
            }
          }

          await updateDoc(challengeRef, { 
            status: 'completed',
            winnerId,
            pointsTransferred: true
          });

          // Refresh data
          const finalSnap = await getDoc(challengeRef);
          const finalData = finalSnap.data() as Challenge;
          setFinalChallengeData(finalData);

          if (winnerId !== 'draw') {
            // Point transfer logic
            const winnerRef = doc(db, 'users', winnerId);
            const loserId = winnerId === data.challengerId ? data.challengedId : data.challengerId;
            const loserRef = doc(db, 'users', loserId);
            const winnerProfileRef = doc(db, 'profiles', winnerId);
            const loserProfileRef = doc(db, 'profiles', loserId);

            const winnerSnap = await getDoc(winnerRef);
            const loserSnap = await getDoc(loserRef);
            
            if (winnerSnap.exists() && loserSnap.exists()) {
              const winnerData = winnerSnap.data() as UserProfile;
              const loserData = loserSnap.data() as UserProfile;

              // Calculate transfer points: 50% of loser's current points
              const transferPoints = Math.floor(loserData.points * 0.5);
              
              const newWinnerPoints = Number((winnerData.points + transferPoints).toFixed(1));
              const newLoserPoints = Number((Math.max(0, loserData.points - transferPoints)).toFixed(1));
              const newWinnerRank = getRankFromPoints(newWinnerPoints);
              const newLoserRank = getRankFromPoints(newLoserPoints);

              try {
                await updateDoc(winnerRef, { 
                  points: newWinnerPoints,
                  rank: newWinnerRank
                });
                await updateDoc(winnerProfileRef, { 
                  points: newWinnerPoints,
                  rank: newWinnerRank
                });
                await updateDoc(loserRef, { 
                  points: newLoserPoints,
                  rank: newLoserRank
                });
                await updateDoc(loserProfileRef, { 
                  points: newLoserPoints,
                  rank: newLoserRank
                });
              } catch (error) {
                console.error("Error transferring points:", error);
              }

              if (profile.uid === winnerId) {
                setResultMessage(`مبروك! لقد فزت بالتحدي وربحت ${transferPoints} نقطة!`);
              } else {
                setResultMessage(`للأسف، خسرت التحدي وتم خصم ${transferPoints} نقطة من رصيدك.`);
              }
            }
          } else {
            setResultMessage("التحدي انتهى بالتعادل!");
          }
        } else {
          setFinalChallengeData(data);
        }
        setShowComparison(true);
      } else {
        setFinalChallengeData(data);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `challenges/${challenge.id}`);
    }
  };

  const handleQuit = async () => {
    const transferPoints = Math.floor(profile.points * 0.5);
    const newMyPoints = Math.max(0, profile.points - transferPoints);
    
    const userRef = doc(db, 'users', profile.uid);
    await updateDoc(userRef, { 
      points: newMyPoints,
      rank: getRankFromPoints(newMyPoints)
    });
    
    const opponentId = isChallenger ? challenge.challengedId : challenge.challengerId;
    const opponentRef = doc(db, 'users', opponentId);
    const opponentSnap = await getDoc(opponentRef);
    if (opponentSnap.exists()) {
      const opponentData = opponentSnap.data() as UserProfile;
      const newOpponentPoints = opponentData.points + transferPoints;
      await updateDoc(opponentRef, { 
        points: newOpponentPoints,
        rank: getRankFromPoints(newOpponentPoints)
      });
    }

    const challengeRef = doc(db, 'challenges', challenge.id);
    await updateDoc(challengeRef, { 
      status: 'completed', 
      winnerId: opponentId 
    });
    
    setResultMessage(`لقد خسرت 50% من نقاطك لزميلك بسبب الانسحاب.`);
    setIsGameOver(true);
  };

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];
  let geoData = null;
  if (currentQuestion.imageUrl) {
    try {
      geoData = JSON.parse(currentQuestion.imageUrl);
    } catch (e) {}
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col p-4 sm:p-6 overflow-y-auto" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <button onClick={handleQuit} className="p-2 hover:bg-red-900/20 rounded-full transition-colors text-red-500 flex items-center gap-2">
          <X size={24} />
          <span className="text-sm font-bold">انسحاب (خسارة 50% من النقاط)</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-purple-500/30">
            <Timer size={18} className={cn(timeLeft < 5 ? "text-red-500 animate-pulse" : "text-purple-400")} />
            <span className="font-mono font-bold text-lg">{timeLeft}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-yellow-500/30">
            <Swords size={18} className="text-yellow-500" />
            <span className="font-bold text-lg">{score} / 15</span>
          </div>
        </div>
      </div>

      <div className="w-full h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
        <motion.div 
          className="h-full bg-red-600"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / 15) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {!isGameOver ? (
          <div className="flex-1 flex flex-col">
            <div className="bg-slate-900/50 border border-red-500/20 p-8 rounded-3xl mb-8 shadow-2xl shadow-red-500/5">
              <div className="flex items-center gap-2 text-red-400 mb-6 justify-center">
                <Brain size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">تحدي مباشر ضد {isChallenger ? challenge.challengedName : challenge.challengerName}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white text-center leading-tight mb-4">
                {currentQuestion.content}
              </h2>
              {currentQuestion.subContent && (
                <div className="text-2xl md:text-4xl font-black text-yellow-500 text-center my-6 font-mono tracking-wider bg-slate-950/50 p-6 rounded-3xl border border-yellow-500/20 shadow-inner overflow-x-auto whitespace-nowrap scrollbar-hide" dir="ltr">
                  {currentQuestion.subContent}
                </div>
              )}
              {geoData && (
                <div className="mt-8">
                  <GeometryCanvas type={geoData.type} params={geoData.params} />
                </div>
              )}
            </div>

            <div className="grid gap-2">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  disabled={!!feedback}
                  className={cn(
                    "p-4 rounded-xl text-right text-base md:text-lg font-bold transition-all border-2 shadow-lg active:scale-95",
                    feedback === 'correct' && option === currentQuestion.correctAnswer
                      ? "bg-green-500/20 border-green-500 text-green-400 shadow-green-500/20"
                      : feedback === 'wrong' && option === selectedOption
                      ? "bg-red-500/20 border-red-500 text-red-400 shadow-red-500/20"
                      : feedback === 'wrong' && option === currentQuestion.correctAnswer
                      ? "bg-green-500/20 border-green-500 text-green-400 shadow-green-500/20"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:border-red-500/50 hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <span className="truncate" dir="ltr">{option}</span>
                    {feedback === 'correct' && option === currentQuestion.correctAnswer && <CheckCircle2 size={20} className="shrink-0" />}
                    {feedback === 'wrong' && option === selectedOption && <AlertCircle size={20} className="shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto w-full py-8">
            <AnimatePresence mode="wait">
              {!showComparison ? (
                <motion.div 
                  key="waiting"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 border-4 border-yellow-500">
                    <Trophy size={48} className="text-yellow-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">انتهى التحدي!</h2>
                  <p className="text-slate-400 mb-8">بانتظار نتيجة الخصم لعرض المقارنة...</p>
                  <button
                    onClick={onClose}
                    className="w-full bg-slate-800 text-white font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-2 active:scale-95"
                  >
                    العودة للرئيسية
                    <ArrowRight size={20} />
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="comparison"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full space-y-8"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-yellow-500 text-black px-6 py-2 rounded-full font-black text-lg mb-4">
                      <Trophy size={20} />
                      {finalChallengeData?.winnerId === profile.uid ? "أنت الفائز!" : "حظاً أوفر المرة القادمة"}
                    </div>
                    <p className="text-yellow-500 font-bold text-xl mb-6">{resultMessage}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn(
                      "p-6 rounded-3xl border-2 transition-all",
                      isChallenger ? "bg-purple-500/10 border-purple-500/50" : "bg-slate-900 border-slate-800"
                    )}>
                      <div className="text-xs text-slate-400 mb-2">أنت</div>
                      <div className="text-2xl font-black text-white mb-1">{score} / 15</div>
                      <div className="text-xs text-slate-500">{totalTime} ثانية</div>
                    </div>
                    <div className={cn(
                      "p-6 rounded-3xl border-2 transition-all",
                      !isChallenger ? "bg-purple-500/10 border-purple-500/50" : "bg-slate-900 border-slate-800"
                    )}>
                      <div className="text-xs text-slate-400">{isChallenger ? challenge.challengedName : challenge.challengerName}</div>
                      <div className="text-2xl font-black text-white mb-1">
                        {isChallenger ? finalChallengeData?.challengedScore : finalChallengeData?.challengerScore} / 15
                      </div>
                      <div className="text-xs text-slate-500">
                        {isChallenger ? finalChallengeData?.challengedTime : finalChallengeData?.challengerTime} ثانية
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="p-4 bg-slate-800/50 border-bottom border-slate-700 font-bold text-sm">مقارنة الإجابات</div>
                    <div className="max-h-[300px] overflow-y-auto p-4 space-y-4">
                      {questions.map((q, idx) => {
                        const myAns = userAnswers[idx];
                        const oppAns = isChallenger ? finalChallengeData?.challengedAnswers?.[idx] : finalChallengeData?.challengerAnswers?.[idx];
                        const isMyCorrect = myAns === q.correctAnswer;
                        const isOppCorrect = oppAns === q.correctAnswer;

                        return (
                          <div key={idx} className="border-b border-slate-800 pb-4 last:border-0">
                            <div className="text-xs text-slate-500 mb-2">سؤال {idx + 1}: {q.content}</div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className={cn("text-xs p-2 rounded-lg", isMyCorrect ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                                إجابتك: {myAns}
                              </div>
                              <div className={cn("text-xs p-2 rounded-lg", isOppCorrect ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                                إجابته: {oppAns}
                              </div>
                            </div>
                            <div className="text-[10px] text-green-500 mt-1">الإجابة الصحيحة: {q.correctAnswer}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95"
                  >
                    العودة للرئيسية
                    <ArrowRight size={20} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
