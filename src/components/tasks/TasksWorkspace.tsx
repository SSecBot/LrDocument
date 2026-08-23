'use client';

import React, { useState } from 'react';
import { useAppStore, getEffectiveTaskPriority } from '@/store/useAppStore';
import { TaskItem } from './TaskItem';
import { TaskPriority } from '@/types';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export const TasksWorkspace: React.FC = () => {
  const { tasks, addTask } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'high' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick add form state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('orta');
  const [quickDueDate, setQuickDueDate] = useState('');

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    addTask({
      title: quickTitle.trim(),
      priority: quickPriority,
      dueDate: quickDueDate || undefined,
      completed: false,
    });

    setQuickTitle('');
    setQuickDueDate('');
    setQuickPriority('orta');
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter((t) => {
    const effectivePriority = getEffectiveTaskPriority(t);

    if (activeFilter === 'today' && t.dueDate !== todayStr) return false;
    if (activeFilter === 'high' && effectivePriority !== 'yuksek') return false;
    if (activeFilter === 'pending' && t.completed) return false;
    if (activeFilter === 'completed' && !t.completed) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121212] overflow-y-auto p-6 md:p-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Top Header & Stats */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-emerald-400" />
              Görevler & Yapılacaklar
            </h2>
            <p className="text-xs text-[#9ca3af] mt-1">
              Matematik araştırmaları, video çekim adımları ve içerik planlama görevleriniz.
            </p>
          </div>

          {/* Progress Card */}
          <div className="bg-[#181818] border border-[#282828] px-4 py-2.5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#71717a] font-medium uppercase">Tamamlanma Oranı</span>
              <span className="text-base font-extrabold text-white">
                %{completionPercentage} <span className="text-xs font-normal text-[#9ca3af]">({completedCount}/{totalCount})</span>
              </span>
            </div>
            <div className="w-24 h-2 bg-[#262626] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Add Form Bar */}
        <form
          onSubmit={handleQuickAdd}
          className="bg-[#181818] border border-[#282828] hover:border-[#387030] p-3 rounded-2xl shadow-lg flex items-center gap-3 flex-wrap transition-colors"
        >
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Yeni bir görev ekleyin (örn: Euler formülü Manim kodunu hazırla)..."
            className="flex-1 min-w-[240px] bg-transparent text-sm text-white placeholder-[#71717a] px-3 py-1.5 focus:outline-none"
          />

          {/* Priority Select */}
          <select
            value={quickPriority}
            onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
            className="bg-[#222] text-xs text-[#e5e7eb] border border-[#333] rounded-xl px-3 py-2 focus:outline-none focus:border-[#2d5a27]"
          >
            <option value="yuksek">🔴 Yüksek Öncelik</option>
            <option value="orta">🟡 Orta Öncelik</option>
            <option value="dusuk">🔵 Düşük Öncelik</option>
          </select>

          {/* Due Date */}
          <div className="flex items-center gap-1.5 bg-[#222] border border-[#333] rounded-xl px-3 py-1.5 text-xs text-[#9ca3af]">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <input
              type="date"
              value={quickDueDate}
              onChange={(e) => setQuickDueDate(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Görev Ekle</span>
          </button>
        </form>

        {/* Filter Bar & Search */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
          {/* Tabs */}
          <div className="flex bg-[#181818] p-1 rounded-xl border border-[#282828] gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeFilter === 'all' ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              Tümü ({tasks.length})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeFilter === 'pending' ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              Bekleyen ({tasks.filter(t => !t.completed).length})
            </button>
            <button
              onClick={() => setActiveFilter('high')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeFilter === 'high' ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              Yüksek Öncelik ({tasks.filter(t => getEffectiveTaskPriority(t) === 'yuksek' && !t.completed).length})
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeFilter === 'completed' ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
            >
              Tamamlananlar ({completedCount})
            </button>
          </div>

          {/* Search input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Görevlerde ara..."
              className="w-full bg-[#181818] border border-[#282828] focus:border-[#2d5a27] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#71717a] focus:outline-none"
            />
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16 bg-[#161616] border border-[#262626] rounded-3xl p-8 space-y-3 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#1f1f1f] border border-[#2e2e2e] flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                <CheckSquare className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {tasks.length === 0 ? 'Henüz Kayıtlı Bir Görev Bulunmuyor' : 'Seçili Filtrede Görev Bulunamadı'}
              </h3>
              <p className="text-xs text-[#9ca3af] max-w-sm mx-auto leading-relaxed">
                {tasks.length === 0
                  ? 'Yukarıdaki hızlı ekleme çubuğunu kullanarak yeni bir görev, araştırma adımı veya video çekim teslimi oluşturun.'
                  : 'Filtre kriterlerinizi değiştirin veya tüm görevleri görüntülemek için "Tümü" sekmesine tıklayın.'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
