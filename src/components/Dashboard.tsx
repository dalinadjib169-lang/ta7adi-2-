import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, Lock, LogOut, Settings, Users, Volume2, VolumeX, Swords, Check, X as CloseX, Brain, ArrowRight, Activity } from 'lucide-react';
import { UserProfile, Challenge, Rank } from '../types';
import { cn, getRankFromPoints } from '../lib/utils';
import Profile from './Profile';
import { db, collection, query, orderBy, limit, onSnapshot, auth, doc, updateDoc, where } from '../lib/firebase';

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

interface DashboardProps {
  profile: UserProfile;
  onStartGame: (level: number) => void;
  onLogout: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onChallenge: (user: UserProfile) => void;
  pendingInvites: Challenge[];
  sentChallenges: Challenge[];
  completedChallenges: Challenge[];
  onAcceptChallenge: (challenge: Challenge) => void;
  onDeclineChallenge: (challenge: Challenge) => void;
  onCancelChallenge: (challenge: Challenge) => void;
  onDeleteChallenge: (challenge: Challenge) => void;
  onViewResult: (challenge: Challenge) => void;
  onEditName: () => void;
  isTeacherView?: boolean;
  onSwitchView?: () => void;
}

export default function Dashboard({ 
  profile, 
  onStartGame, 
  onLogout, 
  soundEnabled, 
  onToggleSound,
  onChallenge,
  pendingInvites,
  sentChallenges,
  completedChallenges,
  onAcceptChallenge,
  onDeclineChallenge,
  onCancelChallenge,
  onDeleteChallenge,
  onViewResult,
  onEditName,
  isTeacherView,
  onSwitchView
}: DashboardProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!profile) return;
    
    // Increased limit to 10 and ensure we get all active users (students only)
    const q = query(collection(db, 'profiles'), where('role', '==', 'student'), orderBy('points', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      setLeaderboard(users);
    }, (error) => {
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: 'list',
        path: 'profiles',
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email
        }
      };
      console.error('Leaderboard error:', JSON.stringify(errInfo));
    });
    return () => unsubscribe();
  }, [profile.uid]);

  const getRankInfo = (rank: string) => {
    switch (rank) {
      case 'worm': return { 
        icon: '🐛', 
        label: 'دودة (< 100)', 
        color: 'text-slate-400'
      };
      case 'eagle': return { 
        icon: '🦅', 
        label: 'نسر (100-249)', 
        color: 'text-blue-400'
      };
      case 'tiger': return { 
        icon: '🐯', 
        label: 'نمر (250-499)', 
        color: 'text-orange-400'
      };
      case 'lion': return { 
        icon: '🦁', 
        label: 'أسد (500-999)', 
        color: 'text-red-400'
      };
      case 'dragon': return { 
        icon: '🐲', 
        label: 'تنين (1000-1999)', 
        color: 'text-purple-400'
      };
      case 'phoenix': return { 
        icon: '🔥', 
        label: 'عنقاء (2000-3999)', 
        color: 'text-yellow-500'
      };
      case 'legend': return { 
        icon: '👑', 
        label: 'أسطورة (4000+)', 
        color: 'text-amber-300'
      };
      default: return { 
        icon: '👤', 
        label: 'تلميذ', 
        color: 'text-white'
      };
    }
  };

  const getTeacherGiftRankBase = (rank: Rank) => {
    switch (rank) {
      case 'legend': return 5.0;
      case 'phoenix': return 3.0;
      case 'dragon': return 2.0;
      case 'lion': return 1.2;
      case 'tiger': return 0.8;
      case 'eagle': return 0.4;
      case 'worm': return 0.2;
      default: return 0.0;
    }
  };

  const getTeacherGift = (user: UserProfile) => {
    const baseGift = getTeacherGiftRankBase(user.rank);
    // Find user's position in the overall leaderboard
    const position = leaderboard.findIndex(u => u.uid === user.uid);
    
    // Bonus multiplier for top players
    if (position >= 0 && position < 3) return baseGift * 2.0; // Top 3 get double
    if (position >= 3 && position < 10) return baseGift * 1.5; // Top 10 get 1.5x
    
    return baseGift;
  };

  const levels = Array.from({ length: 10 }, (_, i) => i + 1);
  const teacherPoints = getTeacherGift(profile).toFixed(1);
  const maxGiftPossible = (getTeacherGiftRankBase('legend') * 2.0).toFixed(1); // 10.0 for top legends

  const handleClaimBonus = async () => {
    const bonus = parseFloat(teacherPoints);
    if (bonus <= 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    if (profile.lastBonusDate === today) {
      alert('لقد حصلت على هدية اليوم بالفعل!');
      return;
    }

    const userRef = doc(db, 'users', profile.uid);
    const newPoints = profile.points + bonus;
    try {
      await updateDoc(userRef, {
        points: newPoints,
        rank: getRankFromPoints(newPoints),
        lastBonusDate: today
      });
      alert(`مبروك! لقد حصلت على ${bonus} نقطة هدية من الأستاذ!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const canClaimBonus = parseFloat(teacherPoints) > 0 && profile.lastBonusDate !== today;

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 pb-24" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div 
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-3 text-right group cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setShowProfile(true)}
        >
          <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-purple-500 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform">
            <span className="text-3xl">{getRankInfo(profile.rank).icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white leading-tight">{profile.displayName}</h1>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEditName();
                }}
                className="p-1 text-slate-500 hover:text-white transition-colors"
              >
                <Settings size={14} />
              </button>
            </div>
            <div className={cn("text-xs font-bold flex items-center gap-1", getRankInfo(profile.rank).color)}>
              {getRankInfo(profile.rank).label}
              <span className="text-yellow-500 mr-2">{teacherPoints} / {maxGiftPossible} نقاط</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isTeacherView && onSwitchView && (
            <button 
              onClick={onSwitchView}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-xl hover:bg-yellow-400 transition-all text-xs font-black shadow-lg shadow-yellow-500/20 animate-pulse hover:animate-none"
            >
              <Activity size={16} />
              العودة للوحة الأستاذ
            </button>
          )}
          <button 
            onClick={onToggleSound}
            className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-slate-400"
          >
            {soundEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
          <button 
            onClick={onLogout}
            className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-red-400"
          >
            <LogOut size={22} />
          </button>
        </div>
      </div>

      {/* Pending Challenges (Received) */}
      {pendingInvites.length > 0 && (
        <div className="mb-8 space-y-3">
          <h2 className="text-sm font-bold text-red-500 flex items-center gap-2 px-1">
            <Swords size={16} />
            تحديات بانتظارك!
          </h2>
          {pendingInvites.map((invite) => (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                  {getRankInfo(invite.challengerRank || 'worm').icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">تحدي من {invite.challengerName}</div>
                  <div className="text-[10px] text-red-400">الفائز يأخذ 50% من نقاط الخاسر!</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onAcceptChallenge(invite)}
                  className="p-2 bg-green-500 hover:bg-green-400 text-white rounded-xl transition-colors"
                >
                  <Check size={20} />
                </button>
                <button 
                  onClick={() => onDeclineChallenge(invite)}
                  className="p-2 bg-red-500 hover:bg-red-400 text-white rounded-xl transition-colors"
                >
                  <CloseX size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Sent Challenges */}
      {sentChallenges.length > 0 && (
        <div className="mb-8 space-y-3">
          <h2 className="text-sm font-bold text-blue-500 flex items-center gap-2 px-1">
            <Swords size={16} />
            تحديات أرسلتها
          </h2>
          {sentChallenges.map((challenge) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                  {getRankInfo(challenge.challengedRank || 'worm').icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">تحديت {challenge.challengedName}</div>
                  <div className="text-[10px] text-blue-400">
                    {challenge.status === 'pending' ? 'بانتظار القبول...' : 
                     challenge.status === 'declined' ? 'تم رفض التحدي' : 'جاري اللعب...'}
                  </div>
                </div>
              </div>
              {challenge.status === 'pending' && (
                <button 
                  onClick={() => onCancelChallenge(challenge)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-colors"
                  title="إلغاء التحدي"
                >
                  <CloseX size={20} />
                </button>
              )}
              {challenge.status === 'declined' && (
                <button 
                  onClick={() => onCancelChallenge(challenge)}
                  className="p-2 bg-red-500/20 text-red-400 rounded-xl transition-colors"
                >
                  <CloseX size={20} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Completed Challenges / Results */}
      {completedChallenges.length > 0 && (
        <div className="mb-8 space-y-3">
          <h2 className="text-sm font-bold text-yellow-500 flex items-center gap-2 px-1">
            <Trophy size={16} />
            نتائج التحديات الأخيرة
          </h2>
          {completedChallenges.map((challenge) => {
            const isWinner = challenge.winnerId === profile.uid;
            const isDraw = challenge.winnerId === 'draw';
            const opponentName = profile.uid === challenge.challengerId ? challenge.challengedName : challenge.challengerName;
            const opponentRank = profile.uid === challenge.challengerId ? challenge.challengedRank : challenge.challengerRank;
            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group relative"
              >
                <div 
                  onClick={() => onViewResult(challenge)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-xl relative",
                    isDraw ? "bg-blue-500/20" : (isWinner ? "bg-green-500/20" : "bg-red-500/20")
                  )}>
                    {isDraw ? '🤝' : (isWinner ? '🏆' : '💀')}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center text-[10px]">
                      {getRankInfo(opponentRank || 'worm').icon}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">ضد {opponentName}</div>
                    <div className={cn("text-[10px]", isDraw ? "text-blue-400" : (isWinner ? "text-green-400" : "text-red-400"))}>
                      {isDraw ? 'تعادل رائع!' : (isWinner ? 'لقد فزت بالتحدي!' : 'حظاً أوفر المرة القادمة')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-4">
                    <div className="text-xs font-bold text-white">
                      {profile.uid === challenge.challengerId ? challenge.challengerScore : challenge.challengedScore} vs {profile.uid === challenge.challengerId ? challenge.challengedScore : challenge.challengerScore}
                    </div>
                    <div className="text-[8px] text-slate-500">عرض التفاصيل</div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChallenge(challenge);
                    }}
                    className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                  >
                    <CloseX size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Main Play Button */}
      <div className="mb-12">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onStartGame(1)}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 p-8 rounded-[2.5rem] shadow-2xl shadow-purple-500/20 flex items-center justify-between group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <div className="relative z-10 text-right">
            <h2 className="text-3xl font-black text-white mb-2">ابدأ اللعب الآن</h2>
            <p className="text-purple-100 text-sm opacity-80">اختبر ذكاءك واجمع النقاط لتصل لمستوى التنين</p>
          </div>
          <div className="relative z-10 w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md group-hover:rotate-12 transition-transform">
            <Brain size={32} className="text-white" />
          </div>
        </motion.button>
      </div>

      {/* Leaderboard & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-slate-900/30 border border-slate-800 rounded-[2rem] p-6">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Users className="text-blue-500" size={20} />
              لوحة المتصدرين
            </h2>
            <div className="space-y-3">
              {leaderboard.map((user, index) => (
                <div 
                  key={user.uid}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-2xl border transition-all",
                    user.uid === profile.uid 
                      ? "bg-purple-500/10 border-purple-500/30" 
                      : "bg-slate-800/50 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0",
                      index === 0 ? "bg-yellow-500 text-black" :
                      index === 1 ? "bg-slate-300 text-black" :
                      index === 2 ? "bg-orange-400 text-black" : "bg-slate-700 text-slate-300"
                    )}>
                      {index + 1}
                    </div>
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-inner">
                        {getRankInfo(user.rank).icon}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate text-white">{user.displayName}</div>
                      <div className={cn("text-[8px] font-bold", getRankInfo(user.rank).color)}>
                        {getRankInfo(user.rank).label}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-black text-white">{user.points.toFixed(1)}</div>
                      <div className="text-[8px] text-slate-500 uppercase">نقطة</div>
                    </div>
                    {user.uid !== profile.uid && (
                      <button 
                        onClick={() => onChallenge(user)}
                        className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg transition-all hover:scale-110"
                        title="إرسال تحدي"
                      >
                        <Swords size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Teacher Gift Info */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-green-500/20 p-6 rounded-[2rem]">
            <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2">
              <Trophy size={18} />
              هدايا الرتب (يومية)
            </h3>
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between items-center p-2 bg-amber-500/10 rounded-lg">
                <span className="text-amber-300">أسطورة (Legend)</span>
                <span className="font-bold text-amber-400">5.0 +</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-yellow-500/10 rounded-lg">
                <span className="text-yellow-300">عنقاء (Phoenix)</span>
                <span className="font-bold text-yellow-400">3.0 +</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-purple-500/10 rounded-lg">
                <span className="text-purple-300">تنين (Dragon)</span>
                <span className="font-bold text-purple-400">2.0 +</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-500/10 rounded-lg">
                <span className="text-red-300">أسد (Lion)</span>
                <span className="font-bold text-red-400">1.2 +</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-slate-500/10 rounded-lg italic">
                <span className="text-slate-400">* يحصل الأوائل (توب 10) على مضاعفات إضافية!</span>
              </div>
            </div>
          </div>

          <motion.button 
            whileHover={canClaimBonus ? { scale: 1.02 } : {}}
            whileTap={canClaimBonus ? { scale: 0.98 } : {}}
            onClick={handleClaimBonus}
            disabled={!canClaimBonus}
            className={cn(
              "w-full p-6 rounded-[2rem] border transition-all text-center relative overflow-hidden",
              canClaimBonus 
                ? "bg-green-500/10 border-green-500/50 shadow-lg shadow-green-500/10" 
                : "bg-slate-900/50 border-slate-800 opacity-50"
            )}
          >
            <div className="text-slate-400 text-[10px] mb-1 uppercase tracking-wider">استلم هديتك اليومية</div>
            <div className={cn("text-2xl font-black", canClaimBonus ? "text-green-400" : "text-slate-500")}>
              +{teacherPoints} نقطة
            </div>
            {canClaimBonus && (
              <div className="absolute top-2 left-2 bg-green-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                متاح!
              </div>
            )}
          </motion.button>
        </div>
      </div>

      {showProfile && (
        <Profile 
          profile={profile} 
          onClose={() => setShowProfile(false)} 
          teacherPoints={teacherPoints}
        />
      )}

      <div className="mt-12 text-center text-slate-700 text-[10px] uppercase tracking-widest">
        <p>developer prof dali nadjib</p>
      </div>
    </div>
  );
}
