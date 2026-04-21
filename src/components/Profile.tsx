import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, ArrowRight, Activity, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface ProfileProps {
  profile: UserProfile;
  onClose: () => void;
  teacherPoints: string;
}

export default function Profile({ profile, onClose, teacherPoints }: ProfileProps) {
  const getRankInfo = (rank: string) => {
    switch (rank) {
      case 'worm': return { 
        icon: '🐛', 
        label: 'دودة', 
        color: 'text-slate-400', 
        bg: 'bg-slate-400/10'
      };
      case 'eagle': return { 
        icon: '🦅', 
        label: 'نسر', 
        color: 'text-blue-400', 
        bg: 'bg-blue-400/10'
      };
      case 'tiger': return { 
        icon: '🐯', 
        label: 'نمر', 
        color: 'text-orange-400', 
        bg: 'bg-orange-400/10'
      };
      case 'lion': return { 
        icon: '🦁', 
        label: 'أسد', 
        color: 'text-red-400', 
        bg: 'bg-red-400/10'
      };
      case 'dragon': return { 
        icon: '🐲', 
        label: 'تنين', 
        color: 'text-purple-400', 
        bg: 'bg-purple-400/10'
      };
      case 'phoenix': return { 
        icon: '🔥', 
        label: 'عنقاء', 
        color: 'text-yellow-500', 
        bg: 'bg-yellow-500/10'
      };
      case 'legend': return { 
        icon: '👑', 
        label: 'أسطورة', 
        color: 'text-amber-300', 
        bg: 'bg-amber-300/10'
      };
      default: return { 
        icon: '👤', 
        label: 'تلميذ', 
        color: 'text-white', 
        bg: 'bg-white/10'
      };
    }
  };

  const rankInfo = getRankInfo(profile.rank);

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col p-6 overflow-y-auto" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">ملفي الشخصي</h1>
        <button onClick={onClose} className="p-2 bg-slate-900 rounded-full text-slate-400">
          <ArrowRight size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className={cn("w-32 h-32 rounded-full flex items-center justify-center text-7xl mb-4 border-4 bg-slate-900 shadow-2xl", rankInfo.color.replace('text', 'border'))}>
          {rankInfo.icon}
        </div>
        <h2 className="text-2xl font-bold text-white">{profile.displayName}</h2>
        <p className={cn("font-bold", rankInfo.color)}>{rankInfo.label}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-yellow-500 mb-2">
            <Trophy size={18} />
            <span className="text-xs font-bold">هدية الأستاذ</span>
          </div>
          <div className="text-2xl font-black text-white">{teacherPoints} <span className="text-sm text-slate-500">/ 3.0</span></div>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-purple-500 mb-2">
            <Star size={18} />
            <span className="text-xs font-bold">إجمالي النقاط</span>
          </div>
          <div className="text-2xl font-black text-white">{profile.points.toFixed(1)} <span className="text-sm text-slate-500">نقطة</span></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="text-green-500" size={20} />
            <span className="text-slate-300">الحالة</span>
          </div>
          <span className="text-green-500 text-sm font-bold">متصل الآن</span>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-blue-500" size={20} />
            <span className="text-slate-300">المكافأة المكتسبة</span>
          </div>
          <span className="text-blue-400 text-sm font-bold">
            +{teacherPoints} نقطة
          </span>
        </div>
      </div>

      <div className="mt-auto pt-12 text-center text-slate-600 text-xs">
        <p>developer prof dali nadjib</p>
      </div>
    </div>
  );
}
