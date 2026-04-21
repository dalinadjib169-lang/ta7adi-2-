import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import TeacherDashboard from './components/TeacherDashboard';
import Game from './components/Game';
import ChallengeGame from './components/ChallengeGame';
import { UserProfile, Rank, Challenge } from './types';
import { generateQuestion, generateChallengeQuestions } from './questionGenerator';
import { motion, AnimatePresence } from 'motion/react';
import { User, ArrowRight, Sparkles, LogIn } from 'lucide-react';
import { getRankFromPoints } from './lib/utils';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, orderBy, limit, getDocFromServer, or } from './lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const TEACHER_EMAILS = ["dalinadjib169@gmail.com", "dalinadjib1990@gmail.com", "profjoujou12@gmail.com", "joujouprof12@gmail.com"];

const INITIAL_PROFILE: Omit<UserProfile, 'displayName' | 'uid' | 'email' | 'role'> = {
  points: 0,
  level: 1,
  unlockedLevels: [1],
  levelScores: {},
  rank: 'worm',
  bonusPoints: 0,
  lastBonusDate: '',
  lastActive: Date.now(),
  isOnline: true
};

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentGameLevel, setCurrentGameLevel] = useState<number | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [pendingInvites, setPendingInvites] = useState<Challenge[]>([]);
  const [sentChallenges, setSentChallenges] = useState<Challenge[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showNameSetup, setShowNameSetup] = useState(false);
  const [tempName, setTempName] = useState('');
  const [viewMode, setViewMode] = useState<'teacher' | 'student'>('student');
  const [completedChallenges, setCompletedChallenges] = useState<Challenge[]>([]);
  const [newChallengeNotify, setNewChallengeNotify] = useState<Challenge | null>(null);

  useEffect(() => {
    const introTimer = setTimeout(() => setShowIntro(false), 3000);
    
    // Safety timeout for loading state
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Loading state timed out. Forcing loading to false.");
        setLoading(false);
      }
    }, 8000);

    let unsubProfile: (() => void) | null = null;
    let unsubChallenges: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (unsubProfile) unsubProfile();
        if (unsubChallenges) unsubChallenges();

        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            const isTeacher = TEACHER_EMAILS.includes(user.email || '');
            const updatedRole = isTeacher ? 'teacher' : 'student';
            
            // Persist the role update if it has changed (critical for teacher access)
            if (userData.role !== updatedRole) {
              await updateDoc(userRef, { role: updatedRole });
            }
            
            const updatedProfile = { ...userData, role: updatedRole };
            setProfile(updatedProfile);
            
            // Force viewMode to teacher for teacher accounts on login
            if (updatedRole === 'teacher') {
              setViewMode('teacher');
            }
            
            // If name is default, show setup
            if (updatedProfile.displayName === 'بطل الرياضيات' || !updatedProfile.displayName) {
              setShowNameSetup(true);
              setTempName(updatedProfile.displayName || '');
            }

            // Ensure public profile is synced - ONLY for students
            if (updatedRole === 'student') {
              await setDoc(doc(db, 'profiles', user.uid), {
                uid: user.uid,
                displayName: updatedProfile.displayName,
                points: updatedProfile.points,
                rank: updatedProfile.rank,
                photoURL: updatedProfile.photoURL || null,
                role: 'student'
              }, { merge: true });
            } else {
              // If they were in profiles but are now teachers, remove them
              try {
                await deleteDoc(doc(db, 'profiles', user.uid));
              } catch (e) {
                // Ignore if doesn't exist
              }
            }
          } else {
            const isTeacher = TEACHER_EMAILS.includes(user.email || '');
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'بطل الرياضيات',
              photoURL: user.photoURL || undefined,
              role: isTeacher ? 'teacher' : 'student',
              ...INITIAL_PROFILE,
            };
            await setDoc(userRef, newProfile);
            if (isTeacher) setViewMode('teacher');
            
            // Create public profile ONLY for students
            if (newProfile.role === 'student') {
              await setDoc(doc(db, 'profiles', user.uid), {
                uid: user.uid,
                displayName: newProfile.displayName,
                points: newProfile.points,
                rank: newProfile.rank,
                photoURL: newProfile.photoURL || null,
                role: 'student'
              });
            }

            setProfile(newProfile);
          }

          // Wait a moment for Firestore to pick up the auth token
          await new Promise(resolve => setTimeout(resolve, 500));

          unsubProfile = onSnapshot(userRef, async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as UserProfile;
              setProfile(data);
              
              // NEW: Centralized sync to public profiles collection for the leaderboard
              if (data.role === 'student') {
                try {
                  await setDoc(doc(db, 'profiles', user.uid), {
                    uid: user.uid,
                    displayName: data.displayName,
                    points: data.points,
                    rank: data.rank,
                    photoURL: data.photoURL || null,
                    role: 'student'
                  }, { merge: true });
                } catch (e) {
                  console.error("Error syncing to profiles:", e);
                }
              }
            }
          }, (error) => {
            const errInfo = {
              error: error instanceof Error ? error.message : String(error),
              operationType: 'get',
              path: `users/${user.uid}`,
              authInfo: {
                userId: auth.currentUser?.uid,
                email: auth.currentUser?.email,
                callbackUserId: user.uid
              }
            };
            console.error('Profile listener error:', JSON.stringify(errInfo));
          });

          // Listen for challenges - Listen for both sent and received
          const q = query(
            collection(db, 'challenges'), 
            or(
              where('challengedId', '==', user.uid),
              where('challengerId', '==', user.uid)
            )
          );
          unsubChallenges = onSnapshot(q, (snapshot) => {
            const invites: Challenge[] = [];
            const sent: Challenge[] = [];
            const completed: Challenge[] = [];
            let activeChallenge: Challenge | null = null;

            snapshot.forEach(doc => {
              const data = doc.data() as Challenge;
              
              // If I am the challenged and it's pending, it's an invite
              if (data.challengedId === user.uid && data.status === 'pending') {
                invites.push(data);
              }
              
              // If I am the challenger and it's pending or declined
              if (data.challengerId === user.uid && (data.status === 'pending' || data.status === 'declined')) {
                sent.push(data);
              }
              
              // If challenge is active (accepted/playing) and I'm part of it
              if (data.status === 'accepted' || data.status === 'playing') {
                // Only set as active if I haven't finished my part yet
                const isChallenger = user.uid === data.challengerId;
                const myScore = isChallenger ? data.challengerScore : data.challengedScore;
                if (myScore === undefined) {
                  activeChallenge = data;
                }
              }

              // If completed and I'm part of it
              if (data.status === 'completed') {
                completed.push(data);
              }
            });
            
            setPendingInvites(prev => {
              // Check if there's a new invite that wasn't there before
              const newInvites = invites.filter(inv => !prev.find(p => p.id === inv.id));
              if (newInvites.length > 0) {
                setNewChallengeNotify(newInvites[0]);
              }
              return invites;
            });
            setSentChallenges(sent);
            setCompletedChallenges(completed.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));
            if (activeChallenge) {
              setCurrentChallenge(activeChallenge);
            } else {
              setCurrentChallenge(null);
            }
          }, (error) => {
            console.error('Challenges listener error:', error);
            // Don't throw here to avoid crashing the app
          });
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(introTimer);
      clearTimeout(loadingTimeout);
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  useEffect(() => {
    if (profile && auth.currentUser && profile.role === 'student') {
      const correctRank = getRankFromPoints(profile.points);
      if (profile.rank !== correctRank) {
        const userRef = doc(db, 'users', profile.uid);
        const profileRef = doc(db, 'profiles', profile.uid);
        
        const updateObj = { rank: correctRank };
        
        updateDoc(userRef, updateObj).catch(console.error);
        updateDoc(profileRef, updateObj).catch(console.error);
      }
    }
  }, [profile?.points, profile?.rank]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login error:', error);
      let message = "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.";
      if (error.code === 'auth/popup-blocked') {
        message = "تم حظر النافذة المنبثقة. يرجى السماح بالمنبثقات في متصفحك.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = "تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.";
      } else if (error.code === 'auth/network-request-failed') {
        message = "فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = "تم إلغاء طلب تسجيل الدخول السابق. يرجى المحاولة مرة أخرى.";
      }
      setError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleStartGame = () => {
    setCurrentGameLevel(1);
  };

  const handleGameComplete = async (level: number, score: number) => {
    if (!profile || !auth.currentUser) return;
    
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const pointsEarned = score; // 1 point per correct answer
    const newPoints = profile.points + pointsEarned;
    const newRank = getRankFromPoints(newPoints);
    
    try {
      await updateDoc(userRef, {
        points: newPoints,
        rank: newRank,
        lastActive: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
    
    setCurrentGameLevel(null);
  };

  const handleChallenge = async (targetUser: UserProfile) => {
    if (!profile) return;
    
    // Check rank restriction: same rank or adjacent rank only
    const ranks: Rank[] = ['worm', 'eagle', 'tiger', 'lion', 'dragon', 'phoenix', 'legend'];
    const myRankIdx = ranks.indexOf(profile.rank);
    const oppRankIdx = ranks.indexOf(targetUser.rank);
    
    const rankDiff = Math.abs(myRankIdx - oppRankIdx);
    
    if (rankDiff > 1) {
      alert(`لا يمكنك تحدي ${targetUser.displayName}! رتبته بعيدة جداً عن رتبتك. يجب عليك تطوير رتبتك لتتحداه.`);
      return;
    }

    const challengeId = Math.random().toString(36).substring(7);
    
    // Difficulty based on the highest rank involved
    const maxRankIdx = Math.max(myRankIdx, oppRankIdx);
    const difficultyLevels = [2, 3, 4, 5, 6, 8, 10];
    const challengeDifficulty = difficultyLevels[maxRankIdx] || 6;
    
    const questions = generateChallengeQuestions(15, challengeDifficulty);
    
    const challenge: Challenge = {
      id: challengeId,
      challengerId: profile.uid,
      challengerName: profile.displayName,
      challengerRank: profile.rank,
      challengedId: targetUser.uid,
      challengedName: targetUser.displayName,
      challengedRank: targetUser.rank,
      status: 'pending',
      timestamp: Date.now(),
      questions
    };

    try {
      await setDoc(doc(db, 'challenges', challengeId), challenge);
      alert(`تم إرسال التحدي إلى ${targetUser.displayName}!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `challenges/${challengeId}`);
    }
  };

  const handleAcceptChallenge = async (challenge: Challenge) => {
    try {
      await updateDoc(doc(db, 'challenges', challenge.id), { status: 'playing' });
      setCurrentChallenge(challenge);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `challenges/${challenge.id}`);
    }
  };

  const handleDeclineChallenge = async (challenge: Challenge) => {
    try {
      await updateDoc(doc(db, 'challenges', challenge.id), { status: 'declined' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `challenges/${challenge.id}`);
    }
  };

  const handleCancelChallenge = async (challenge: Challenge) => {
    // For simplicity, just delete the challenge doc or set status to cancelled
    try {
      await updateDoc(doc(db, 'challenges', challenge.id), { status: 'cancelled' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `challenges/${challenge.id}`);
    }
  };

  const handleDeleteChallenge = async (challenge: Challenge) => {
    try {
      // We set a hidden flag or just delete it. 
      // Since the user wants to "wipe" results, deleting is better.
      // But we should probably only delete if both finished or it's cancelled/declined.
      await deleteDoc(doc(db, 'challenges', challenge.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `challenges/${challenge.id}`);
    }
  };

  const handleSaveName = async () => {
    if (!profile || !tempName.trim()) return;
    
    const userRef = doc(db, 'users', profile.uid);
    const profileRef = doc(db, 'profiles', profile.uid);
    
    try {
      await updateDoc(userRef, { displayName: tempName.trim() });
      await updateDoc(profileRef, { displayName: tempName.trim() });
      
      setProfile(prev => prev ? { ...prev, displayName: tempName.trim() } : null);
      setShowNameSetup(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  return (
    <div className="min-h-screen bg-black font-sans">
      {(showIntro || loading) ? (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-center p-6 z-[100]">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-white mb-2">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</h1>
            <h2 className="text-2xl text-yellow-500">اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى سَيِّدِنَا مُحَمَّدٍ</h2>
            <div className="pt-12">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 text-sm animate-pulse">جاري تحضير التحدي...</p>
              {loading && (
                <button 
                  onClick={() => setLoading(false)}
                  className="mt-8 text-xs text-slate-600 hover:text-slate-400 underline"
                >
                  تخطي التحميل (إذا استغرق وقتاً طويلاً)
                </button>
              )}
            </div>
          </div>
        </div>
      ) : !profile ? (
        <div className="min-h-screen bg-black flex items-center justify-center p-6" dir="rtl">
          <div className="w-full max-w-md">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-600/20 rotate-3">
                <Sparkles size={40} className="text-white" />
              </div>
              <h1 className="text-3xl font-black text-white mb-2">Math Quest 2AM</h1>
              <p className="text-slate-400">مرحباً بك في رحلة التحدي والذكاء</p>
            </div>

            <div className="bg-slate-900/50 border border-purple-500/20 p-8 rounded-[2rem] backdrop-blur-xl">
              <div className="space-y-6">
                <p className="text-center text-slate-300 text-sm">سجل دخولك لحفظ تقدمك والمنافسة على الصدارة</p>
                
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-400 text-xs text-center">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg hover:bg-slate-100"
                >
                  <LogIn size={20} />
                  الدخول عبر Google
                </button>
              </div>
            </div>
            <div className="mt-8 text-center text-slate-600 text-xs">
              <p>developer prof dali nadjib</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen">
          {profile.role === 'teacher' && viewMode === 'teacher' ? (
            <TeacherDashboard 
              profile={profile}
              onLogout={handleLogout}
              onSwitchView={() => setViewMode('student')}
            />
          ) : (
            <Dashboard 
              profile={profile}
              onStartGame={handleStartGame} 
              onLogout={handleLogout}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              onChallenge={handleChallenge}
              pendingInvites={pendingInvites}
              sentChallenges={sentChallenges}
              completedChallenges={completedChallenges}
              onAcceptChallenge={handleAcceptChallenge}
              onDeclineChallenge={handleDeclineChallenge}
              onCancelChallenge={handleCancelChallenge}
              onDeleteChallenge={handleDeleteChallenge}
              onViewResult={(challenge) => setCurrentChallenge(challenge)}
              onEditName={() => {
                setTempName(profile.displayName);
                setShowNameSetup(true);
              }}
              isTeacherView={profile.role === 'teacher'}
              onSwitchView={() => setViewMode('teacher')}
            />
          )}

          {/* Name Setup Modal */}
          <AnimatePresence>
            {showNameSetup && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6" dir="rtl">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900 border border-purple-500/30 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl"
                >
                  <h2 className="text-2xl font-black text-white mb-2">مرحباً بك يا بطل!</h2>
                  <p className="text-slate-400 mb-6 text-sm">أدخل اسمك الذي سيظهر للجميع في لوحة المتصدرين والتحديات.</p>
                  
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="أدخل اسمك هنا..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold mb-6 focus:border-purple-500 outline-none transition-colors"
                    maxLength={20}
                  />
                  
                  <button
                    onClick={handleSaveName}
                    disabled={!tempName.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-600/20 transition-all active:scale-95"
                  >
                    حفظ والبدء
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Challenge Notification */}
          <AnimatePresence>
            {newChallengeNotify && (
              <motion.div
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 20 }}
                exit={{ opacity: 0, y: -100 }}
                className="fixed top-0 left-0 right-0 z-[300] flex justify-center p-4 pointer-events-none"
                dir="rtl"
              >
                <div className="bg-purple-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 pointer-events-auto border border-white/20">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
                    {(() => {
                      switch (newChallengeNotify.challengerRank) {
                        case 'worm': return '🐛';
                        case 'eagle': return '🦅';
                        case 'tiger': return '🐯';
                        case 'lion': return '🦁';
                        case 'dragon': return '🐲';
                        case 'phoenix': return '🔥';
                        case 'legend': return '👑';
                        default: return '⚔️';
                      }
                    })()}
                  </div>
                  <div>
                    <div className="font-bold">تحدي جديد!</div>
                    <div className="text-xs opacity-90">أرسل لك {newChallengeNotify.challengerName} تحدياً جديداً</div>
                  </div>
                  <div className="flex gap-2 mr-4">
                    <button 
                      onClick={() => {
                        handleAcceptChallenge(newChallengeNotify);
                        setNewChallengeNotify(null);
                      }}
                      className="bg-white text-purple-600 px-4 py-1.5 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
                    >
                      قبول
                    </button>
                    <button 
                      onClick={() => setNewChallengeNotify(null)}
                      className="bg-purple-700 text-white px-4 py-1.5 rounded-xl font-bold text-sm hover:bg-purple-800 transition-colors"
                    >
                      تجاهل
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {currentGameLevel !== null && (
            <Game 
              level={1} 
              rank={profile.rank}
              onClose={() => setCurrentGameLevel(null)}
              onLevelComplete={handleGameComplete}
              soundEnabled={soundEnabled}
            />
          )}

          {currentChallenge && (
            <ChallengeGame
              challenge={currentChallenge}
              profile={profile}
              onClose={() => setCurrentChallenge(null)}
              soundEnabled={soundEnabled}
            />
          )}
        </div>
      )}
    </div>
  );
}
