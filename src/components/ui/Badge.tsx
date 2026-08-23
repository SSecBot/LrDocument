import React from 'react';
import { Platform, ScriptStatus, TaskPriority, EventStatus } from '@/types';
import { Film, Globe, Mic, CheckCircle2, Clock, PlayCircle, Edit3, Flame, Play, Video, Camera } from 'lucide-react';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'forest' | 'secondary' | 'outline' | 'danger' | 'warning';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    default: 'bg-[#242424] text-[#e5e7eb] border border-[#333333]',
    forest: 'bg-[#2d5a27]/25 text-[#4ade80] border border-[#2d5a27]/50',
    secondary: 'bg-[#181818] text-[#9ca3af] border border-[#282828]',
    outline: 'bg-transparent text-[#e5e7eb] border border-[#3f3f46]',
    danger: 'bg-rose-950/40 text-rose-300 border border-rose-800/40',
    warning: 'bg-amber-950/40 text-amber-300 border border-amber-800/40',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md tracking-wide ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const PlatformBadge: React.FC<{ platform: Platform; size?: 'sm' | 'md' }> = ({
  platform,
  size = 'md',
}) => {
  const configs: Record<Platform, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
    YouTube: {
      icon: <Play className="w-3 h-3 fill-red-400 text-red-400" />,
      bg: 'bg-red-950/40',
      text: 'text-red-300',
      border: 'border-red-800/40',
    },
    TikTok: {
      icon: <Film className="w-3.5 h-3.5" />,
      bg: 'bg-cyan-950/40',
      text: 'text-cyan-300',
      border: 'border-cyan-800/40',
    },
    Instagram: {
      icon: <Camera className="w-3.5 h-3.5" />,
      bg: 'bg-pink-950/40',
      text: 'text-pink-300',
      border: 'border-pink-800/40',
    },
    Web: {
      icon: <Globe className="w-3.5 h-3.5" />,
      bg: 'bg-blue-950/40',
      text: 'text-blue-300',
      border: 'border-blue-800/40',
    },
    Podcast: {
      icon: <Mic className="w-3.5 h-3.5" />,
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-300',
      border: 'border-emerald-800/40',
    },
  };

  const c = configs[platform] || configs.Web;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${sizeClasses} ${c.bg} ${c.text} ${c.border}`}>
      {c.icon}
      <span>{platform}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const configs: Record<TaskPriority, { label: string; bg: string; text: string; border: string }> = {
    yuksek: {
      label: 'Yüksek',
      bg: 'bg-rose-950/40',
      text: 'text-rose-300',
      border: 'border-rose-800/40',
    },
    orta: {
      label: 'Orta',
      bg: 'bg-amber-950/40',
      text: 'text-amber-300',
      border: 'border-amber-800/40',
    },
    dusuk: {
      label: 'Düşük',
      bg: 'bg-sky-950/40',
      text: 'text-sky-300',
      border: 'border-sky-800/40',
    },
  };

  const c = configs[priority] || configs.orta;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
};

export const ScriptStatusBadge: React.FC<{ status: ScriptStatus }> = ({ status }) => {
  const configs: Record<ScriptStatus, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
    fikir: {
      label: 'Fikir',
      icon: <Flame className="w-3 h-3 text-amber-400" />,
      bg: 'bg-zinc-900',
      text: 'text-zinc-300',
      border: 'border-zinc-700',
    },
    senaryo_hazir: {
      label: 'Senaryo Hazır',
      icon: <Edit3 className="w-3 h-3 text-blue-400" />,
      bg: 'bg-blue-950/40',
      text: 'text-blue-300',
      border: 'border-blue-800/40',
    },
    cekimde: {
      label: 'Çekimde',
      icon: <PlayCircle className="w-3 h-3 text-orange-400" />,
      bg: 'bg-amber-950/40',
      text: 'text-amber-300',
      border: 'border-amber-800/40',
    },
    kurguda: {
      label: 'Kurguda',
      icon: <Clock className="w-3 h-3 text-purple-400" />,
      bg: 'bg-purple-950/40',
      text: 'text-purple-300',
      border: 'border-purple-800/40',
    },
    yayina_hazir: {
      label: 'Yayına Hazır',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-300',
      border: 'border-emerald-800/40',
    },
  };

  const c = configs[status] || configs.fikir;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border ${c.bg} ${c.text} ${c.border}`}>
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};
