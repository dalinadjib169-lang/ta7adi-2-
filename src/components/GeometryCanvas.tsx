import React from 'react';

interface GeometryCanvasProps {
  type: 'rectangle' | 'square' | 'parallelogram' | 'triangle' | 'circle' | 'composite';
  params: any;
}

export default function GeometryCanvas({ type, params }: GeometryCanvasProps) {
  return (
    <div className="w-full aspect-video bg-slate-800/50 rounded-2xl flex items-center justify-center p-4 border border-slate-700">
      <svg viewBox="0 0 200 120" className="w-full h-full drop-shadow-xl">
        {type === 'rectangle' && (
          <g>
            <rect x="40" y="30" width="120" height="60" fill="none" stroke="#9333ea" strokeWidth="2" />
            <text x="100" y="25" textAnchor="middle" fill="#94a3b8" fontSize="8" dir="ltr">{params.width} cm</text>
            <text x="35" y="60" textAnchor="end" fill="#94a3b8" fontSize="8" dir="ltr">{params.height} cm</text>
          </g>
        )}
        {type === 'square' && (
          <g>
            <rect x="60" y="20" width="80" height="80" fill="none" stroke="#eab308" strokeWidth="2" />
            <text x="100" y="15" textAnchor="middle" fill="#94a3b8" fontSize="8" dir="ltr">{params.side} cm</text>
          </g>
        )}
        {type === 'parallelogram' && (
          <g>
            <path d="M60 30 L160 30 L140 90 L40 90 Z" fill="none" stroke="#22c55e" strokeWidth="2" />
            <line x1="60" y1="30" x2="60" y2="90" stroke="#ef4444" strokeWidth="1" strokeDasharray="2" />
            <text x="110" y="25" textAnchor="middle" fill="#94a3b8" fontSize="8" dir="ltr">{params.base} cm</text>
            <text x="55" y="60" textAnchor="end" fill="#ef4444" fontSize="8" dir="ltr">{params.height} cm</text>
          </g>
        )}
        {type === 'triangle' && (
          <g>
            <path d="M100 20 L160 90 L40 90 Z" fill="none" stroke="#3b82f6" strokeWidth="2" />
            <line x1="100" y1="20" x2="100" y2="90" stroke="#ef4444" strokeWidth="1" strokeDasharray="2" />
            <text x="100" y="100" textAnchor="middle" fill="#94a3b8" fontSize="8" dir="ltr">{params.base} cm</text>
            <text x="105" y="55" textAnchor="start" fill="#ef4444" fontSize="8" dir="ltr">{params.height} cm</text>
          </g>
        )}
        {type === 'circle' && (
          <g>
            <circle cx="100" cy="60" r="40" fill="none" stroke="#ec4899" strokeWidth="2" />
            <line x1="100" y1="60" x2="140" y2="60" stroke="#94a3b8" strokeWidth="1" />
            <text x="120" y="55" textAnchor="middle" fill="#94a3b8" fontSize="8" dir="ltr">r = {params.radius}</text>
          </g>
        )}
        {type === 'composite' && (
          <g>
            {/* Rectangle + Triangle */}
            <rect x="40" y="50" width="80" height="40" fill="none" stroke="#9333ea" strokeWidth="2" />
            <path d="M120 50 L160 90 L120 90 Z" fill="none" stroke="#3b82f6" strokeWidth="2" />
            <text x="80" y="105" textAnchor="middle" fill="#94a3b8" fontSize="8" dir="ltr">x = {params.x}</text>
          </g>
        )}
      </svg>
    </div>
  );
}
