import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, X, CheckCircle2, AlertCircle, ArrowRight, Brain } from 'lucide-react';
import { generateQuestion } from '../questionGenerator';
import { Question, Rank as UserRank } from '../types';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';
import GeometryCanvas from './GeometryCanvas';

interface GameProps {
  level: number;
  rank: UserRank;
  onClose: () => void;
  onLevelComplete: (level: number, score: number) => void;
  soundEnabled: boolean;
}

export default function Game({ level, rank, onClose, onLevelComplete, soundEnabled }: GameProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [manualAnswer, setManualAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    // Reset state for new level
    setCurrentIndex(0);
    setFeedback(null);
    setSelectedOption(null);
    setManualAnswer('');
    setIsGameOver(false);
    setScore(0);

    // Generate 15 unique questions
    const qList: Question[] = [];
    const usedContents = new Set<string>();
    let attempts = 0;
    const maxAttempts = 200;
    
    const getBaseDifficulty = (r: UserRank) => {
      switch (r) {
        case 'worm': return 1;
        case 'eagle': return 2;
        case 'tiger': return 3;
        case 'lion': return 4;
        case 'dragon': return 5;
        case 'phoenix': return 6;
        case 'legend': return 8;
        default: return 1;
      }
    };
    const baseDifficulty = getBaseDifficulty(rank);

    while (qList.length < 15 && attempts < maxAttempts) {
      attempts++;
      try {
        const q = generateQuestion(baseDifficulty);
        if (q && q.content && !usedContents.has(q.content)) {
          qList.push(q);
          usedContents.add(q.content);
        }
      } catch (e) {
        console.error("Error generating question:", e);
      }
    }

    // Fallback if not enough questions
    if (qList.length < 15) {
      while (qList.length < 15) {
        qList.push({
          id: `fallback-${qList.length}`,
          type: 'text',
          answerType: 'choice',
          content: "سؤال إضافي: ما هو ناتج 1 + 1؟",
          options: ["2", "3", "4", "5"],
          correctAnswer: "2",
          timer: 20
        });
      }
    }
    
    setQuestions(qList);
    if (qList.length > 0) {
      setTimeLeft(qList[0].timer);
    }
  }, [level]);

  useEffect(() => {
    if (questions.length > 0 && timeLeft > 0 && !isGameOver && !feedback) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (questions.length > 0 && timeLeft === 0 && !isGameOver && !feedback) {
      handleAnswer('');
    }
  }, [timeLeft, isGameOver, feedback, questions.length]);

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
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  };

  const handleAnswer = async (option: string) => {
    if (feedback || questions.length === 0 || !questions[currentIndex]) return;
    
    const currentQ = questions[currentIndex];
    setSelectedOption(option);
    
    // Normalize comparison: remove all spaces, trim, and convert Arabic numerals
    const normalize = (s: string) => {
      const arabicNumerals = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
      let normalized = s.replace(/\s+/g, '').trim();
      for (let i = 0; i < 10; i++) {
        normalized = normalized.replace(arabicNumerals[i], i.toString());
      }
      return normalized;
    };
    const isCorrect = normalize(option) === normalize(currentQ.correctAnswer);
    
    setFeedback(isCorrect ? 'correct' : 'wrong');
    playSound(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      setScore(s => Math.min(10, s + 1));
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9333ea', '#eab308', '#22c55e']
      });
    } else {
      let penalty = 0;
      switch (rank) {
        case 'worm': penalty = 0.2; break;
        case 'eagle': penalty = 0.3; break;
        case 'tiger': penalty = 0.4; break;
        case 'lion': penalty = 0.5; break;
        case 'dragon': penalty = 0.6; break;
        case 'phoenix': penalty = 0.8; break;
        case 'legend': penalty = 1.0; break;
        default: penalty = 0.2;
      }
      setScore(s => Math.max(0, s - penalty));
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedOption(null);
        setManualAnswer('');
        setFeedback(null);
        setTimeLeft(questions[currentIndex + 1].timer);
      } else {
        setIsGameOver(true);
      }
    }, 1500);
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col p-4 sm:p-6 overflow-y-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <X size={24} className="text-slate-400" />
        </button>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-purple-500/30">
            <Timer size={18} className={cn(timeLeft < 5 ? "text-red-500 animate-pulse" : "text-purple-400")} />
            <span className="font-mono font-bold text-lg">{timeLeft}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-yellow-500/30">
            <Trophy size={18} className="text-yellow-500" />
            <span className="font-bold text-lg">{score.toFixed(1)} / 15.0</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
        <motion.div 
          className="h-full bg-purple-600"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {!isGameOver ? (
          <div className="flex-1 flex flex-col">
            <div className="bg-slate-900/50 border border-purple-500/20 p-6 rounded-3xl mb-6">
              <div className="flex items-center gap-2 text-purple-400 mb-4">
                <Brain size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">تحدي المهارات</span>
              </div>
              <h2 className="text-xl font-bold text-white text-center leading-relaxed mb-4">
                {currentQuestion.content}
              </h2>
              {currentQuestion.subContent && currentQuestion.subContent.trim() !== "" && (
                <div className="text-2xl md:text-4xl font-black text-yellow-400 text-center my-6 font-mono tracking-wider bg-slate-950/50 p-6 rounded-3xl border border-yellow-500/20 shadow-inner overflow-x-auto whitespace-nowrap scrollbar-hide" dir="ltr">
                  {currentQuestion.subContent}
                </div>
              )}
              {geoData && (
                <div className="mt-4">
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
                    "p-4 rounded-xl text-right text-base md:text-lg font-bold transition-all border-2 active:scale-95",
                    feedback === 'correct' && option === currentQuestion.correctAnswer
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : feedback === 'wrong' && option === selectedOption
                      ? "bg-red-500/20 border-red-500 text-red-400"
                      : feedback === 'wrong' && option === currentQuestion.correctAnswer
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:border-purple-500/50"
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
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto w-full">
            <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 border-4 border-yellow-500 shadow-lg shadow-yellow-500/20">
              <Trophy size={48} className="text-yellow-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">أحسنت!</h2>
            <p className="text-slate-400 mb-8">لقد أكملت المستوى {level} بنجاح</p>
            
            <div className="bg-slate-900 p-6 rounded-3xl border border-purple-500/30 w-full mb-8">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-right">
                  <div className="text-slate-400 text-xs mb-1">النقاط المحصلة</div>
                  <div className="text-2xl font-black text-white">{score.toFixed(1)}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-xs mb-1">التقدم في المستوى</div>
                  <div className="text-2xl font-black text-purple-500">{((score / 10) * 100).toFixed(0)}%</div>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600" style={{ width: `${(score / 10) * 100}%` }} />
              </div>
            </div>

            <button
              onClick={() => onLevelComplete(level, score)}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-white/10 active:scale-95"
            >
              متابعة
              <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
