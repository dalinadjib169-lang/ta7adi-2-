import React, { useState, useEffect } from 'react';
import { UserProfile, Challenge } from '../types';
import { db, collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Swords, Trophy, LogOut, Search, Trash2, Star, Activity, ArrowRight, X } from 'lucide-react';
import { cn, getRankFromPoints } from '../lib/utils';

interface TeacherDashboardProps {
  profile: UserProfile;
  onLogout: () => void;
  onSwitchView: () => void;
}

export default function TeacherDashboard({ profile, onLogout, onSwitchView }: TeacherDashboardProps) {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeTab, setActiveTab] = useState<'students' | 'challenges' | 'leaderboard'>('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  useEffect(() => {
    // Listen to all student profiles
    const qStudents = query(collection(db, 'profiles'), where('role', '==', 'student'), orderBy('points', 'desc'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const docs: UserProfile[] = [];
      snapshot.forEach(d => docs.push(d.data() as UserProfile));
      setStudents(docs);
    });

    // Listen to all challenges
    const qChallenges = query(collection(db, 'challenges'), orderBy('timestamp', 'desc'));
    const unsubChallenges = onSnapshot(qChallenges, (snapshot) => {
      const docs: Challenge[] = [];
      snapshot.forEach(d => docs.push(d.data() as Challenge));
      setChallenges(docs);
    });

    return () => {
      unsubStudents();
      unsubChallenges();
    };
  }, []);

  const handleDeleteChallenge = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا التحدي؟')) {
      await deleteDoc(doc(db, 'challenges', id));
    }
  };

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'worm': return '🐛';
      case 'eagle': return '🦅';
      case 'tiger': return '🐯';
      case 'lion': return '🦁';
      case 'dragon': return '🐲';
      case 'phoenix': return '🔥';
      case 'legend': return '👑';
      default: return '👤';
    }
  };

  const filteredStudents = students.filter(s => 
    s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-24" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-2xl">👨‍🏫</div>
          <div>
            <h1 className="text-xl font-bold">لوحة تحكم الأستاذ</h1>
            <p className="text-slate-400 text-xs">{profile.displayName} ({profile.email})</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onSwitchView}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 border border-purple-500/30 text-purple-400 rounded-xl hover:bg-purple-600/20 transition-all text-xs font-bold"
          >
            <Activity size={16} />
            وضع التلميذ
          </button>
          <button 
            onClick={onLogout}
            className="p-3 bg-slate-900 rounded-xl hover:bg-slate-800 text-red-400 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-slate-900 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('students')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'students' ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <Users size={18} />
          التلاميذ ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'challenges' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <Swords size={18} />
          التحديات ({challenges.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'leaderboard' ? "bg-yellow-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <Trophy size={18} />
          الترتيب
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'students' && (
          <>
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="text"
                placeholder="بحث عن تلميذ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pr-12 pl-4 outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((student) => (
                <motion.div
                  key={student.uid}
                  layoutId={student.uid}
                  onClick={() => setSelectedStudent(student)}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl overflow-hidden">
                      {getRankIcon(getRankFromPoints(student.points))}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{student.displayName}</h3>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-purple-400 font-bold">{student.points} نقطة</div>
                    <div className="text-[10px] text-slate-500">مستوى {student.level}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-4">
            {challenges.map((c) => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{new Date(c.timestamp).toLocaleString('ar-EG')}</span>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                      c.status === 'completed' ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                    )}>
                      {c.status}
                    </span>
                  </div>
                    <button 
                      onClick={() => setSelectedChallenge(c)}
                      className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                      title="عرض التفاصيل"
                    >
                      <Activity size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteChallenge(c.id)}
                      className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="font-bold text-sm">{c.challengerName}</div>
                    <div className="text-xs text-slate-500">{c.challengerScore ?? '-'}</div>
                  </div>
                  <div className="px-4 text-slate-700">VS</div>
                  <div className="text-center flex-1">
                    <div className="font-bold text-sm">{c.challengedName}</div>
                    <div className="text-xs text-slate-500">{c.challengedScore ?? '-'}</div>
                  </div>
                </div>
                {c.winnerId && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-center text-xs text-yellow-500 font-bold">
                    الفائز: {c.winnerId === 'draw' ? 'تعادل' : (c.winnerId === c.challengerId ? c.challengerName : c.challengedName)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="text-yellow-500" size={20} />
                ترتيب التلاميذ
              </h2>
            </div>
            <div className="divide-y divide-slate-800">
              {students.map((student, index) => (
                <div key={student.uid} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm",
                      index === 0 ? "bg-yellow-500 text-black" : 
                      index === 1 ? "bg-slate-300 text-black" :
                      index === 2 ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg overflow-hidden">
                        {getRankIcon(getRankFromPoints(student.points))}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{student.displayName}</div>
                        <div className="text-[10px] text-slate-500">مستوى {student.level}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white">{student.points}</div>
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider">نقطة</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Challenge Detail Modal */}
      <AnimatePresence>
        {selectedChallenge && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Swords className="text-red-500" size={20} />
                  تفاصيل التحدي
                </h2>
                <button onClick={() => setSelectedChallenge(null)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-8 mb-8 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-black text-slate-800">VS</div>
                  
                  <div className="text-center space-y-2">
                    <div className="text-4xl">{getRankIcon(getRankFromPoints(selectedChallenge.challengerScore || 0))}</div>
                    <div className="font-bold text-lg">{selectedChallenge.challengerName}</div>
                    <div className="text-2xl font-black text-purple-400">{selectedChallenge.challengerScore ?? '--'}</div>
                    <div className="text-xs text-slate-500">{selectedChallenge.challengerTime ?? '--'} ثانية</div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="text-4xl">{getRankIcon(getRankFromPoints(selectedChallenge.challengedScore || 0))}</div>
                    <div className="font-bold text-lg">{selectedChallenge.challengedName}</div>
                    <div className="text-2xl font-black text-blue-400">{selectedChallenge.challengedScore ?? '--'}</div>
                    <div className="text-xs text-slate-500">{selectedChallenge.challengedTime ?? '--'} ثانية</div>
                  </div>
                </div>

                {selectedChallenge.status === 'completed' && (
                  <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-center">
                    <div className="text-xs text-yellow-500 font-bold uppercase mb-1">النتيجة النهائية</div>
                    <div className="text-xl font-black text-white">
                      {selectedChallenge.winnerId === 'draw' ? 'تعادل!' : (selectedChallenge.winnerId === selectedChallenge.challengerId ? `الفائز: ${selectedChallenge.challengerName}` : `الفائز: ${selectedChallenge.challengedName}`)}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-slate-400 flex items-center gap-2">
                    <Activity size={14} />
                    مقارنة الإجابات
                  </h3>
                  <div className="space-y-3">
                    {selectedChallenge.questions.map((q, idx) => (
                      <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <div className="text-xs text-slate-500 mb-2">سؤال {idx + 1}: {q.content}</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className={cn("text-[10px] p-2 rounded-lg", selectedChallenge.challengerAnswers?.[idx] === q.correctAnswer ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                            {selectedChallenge.challengerName}: {selectedChallenge.challengerAnswers?.[idx] || '---'}
                          </div>
                          <div className={cn("text-[10px] p-2 rounded-lg", selectedChallenge.challengedAnswers?.[idx] === q.correctAnswer ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                            {selectedChallenge.challengedName}: {selectedChallenge.challengedAnswers?.[idx] || '---'}
                          </div>
                        </div>
                        <div className="text-[10px] text-green-500 mt-1">الإجابة الصحيحة: {q.correctAnswer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800">
                <button onClick={() => setSelectedChallenge(null)} className="w-full py-4 bg-slate-900 rounded-2xl font-bold">إغلاق</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-4xl overflow-hidden">
                    {getRankIcon(getRankFromPoints(selectedStudent.points))}
                  </div>
                  <button 
                    onClick={() => setSelectedStudent(null)}
                    className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <h2 className="text-2xl font-black text-white mb-1">{selectedStudent.displayName}</h2>
                <p className="text-slate-400 text-sm mb-8">{selectedStudent.email}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">النقاط</div>
                    <div className="text-xl font-black text-purple-400">{selectedStudent.points}</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">المستوى</div>
                    <div className="text-xl font-black text-blue-400">{selectedStudent.level}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-sm text-slate-400">آخر نشاط</span>
                    <span className="text-sm font-bold">{new Date(selectedStudent.lastActive).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-sm text-slate-400">الرتبة</span>
                    <span className="text-sm font-bold text-yellow-500 uppercase">{selectedStudent.rank}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-slate-950 border-t border-slate-800">
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 rounded-2xl font-bold transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
