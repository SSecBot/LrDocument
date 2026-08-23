'use client';

import React from 'react';
import { calculateTiming, WPM_PRESETS } from '@/lib/scriptTiming';
import { Clock, Type, Gauge } from 'lucide-react';

interface ScriptTimingBarProps {
  fullText: string;
  wpm: number;
  onWpmChange: (wpm: number) => void;
}

export const ScriptTimingBar: React.FC<ScriptTimingBarProps> = ({
  fullText,
  wpm,
  onWpmChange,
}) => {
  const stats = calculateTiming(fullText, wpm);

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-[#181818] border-b border-[#282828] gap-4 flex-wrap">
      {/* Duration gauge */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 bg-[#202820] border border-[#2d5a27]/50 px-3.5 py-1.5 rounded-xl shadow-inner">
          <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-wider">Tahmini Konuşma Süresi</span>
            <span className="text-base font-extrabold text-white tracking-tight">
              {stats.formattedDuration || '0 sn'}
            </span>
          </div>
        </div>

        {/* Word and Char counts */}
        <div className="flex items-center gap-3 text-xs text-[#9ca3af]">
          <div className="flex items-center gap-1.5 bg-[#222] px-2.5 py-1.5 rounded-lg border border-[#333]">
            <Type className="w-3.5 h-3.5 text-emerald-400" />
            <span><strong className="text-white">{stats.wordCount}</strong> kelime</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#222] px-2.5 py-1.5 rounded-lg border border-[#333]">
            <span><strong className="text-white">{stats.characterCount}</strong> karakter</span>
          </div>
        </div>
      </div>

      {/* Speed (WPM) Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Konuşma Hızı:</span>
          <select
            value={wpm}
            onChange={(e) => onWpmChange(Number(e.target.value))}
            className="bg-[#222] text-[#e5e7eb] border border-[#333] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#2d5a27]"
          >
            {WPM_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
