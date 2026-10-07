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
} from 'lucide-react';
import { toLocalDateString } from '@/lib/utils';

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

  const todayStr = toLocalDateString();

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
    <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto p-4 sm:p-5 md:p-6">
      <div className="max-w-4xl mx-auto w-full space-y-5 sm:space-y-5">
        {/* Top Header & Stats */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <CheckSquare className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-400" />
              Görevler & Yapılacaklar
            </h2>
            <p className="text-xs text-subtle mt-1">
              Matematik araştırmaları, video çekim adımları ve içerik planlama görevleriniz.
            </p>
          </div>

          {/* Progress Card */}
          <div className="bg-surface border border-line px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-3 sm:gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted font-medium uppercase">Tamamlanma</span>
              <span className="text-sm sm:text-base font-bold text-white">
                %{completionPercentage} <span className="text-xs font-normal text-subtle">({completedCount}/{totalCount})</span>
              </span>
            </div>
            <div className="w-20 sm:w-24 h-2 bg-surface-2 rounded-full overflow-hidden">
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
          className="bg-surface border border-line hover:border-brand-hover p-2.5 sm:p-3 rounded-lg flex items-center gap-2 sm:gap-3 flex-wrap transition-colors"
        >
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Yeni bir görev ekleyin..."
            className="flex-1 min-w-[200px] bg-transparent text-xs sm:text-sm text-white placeholder-muted px-3 py-2 focus:outline-none min-h-[40px]"
          />

          {/* Priority Select */}
          <select
            value={quickPriority}
            onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
            className="min-h-[40px] bg-surface-2 text-xs text-body border border-line-strong rounded-lg px-2.5 py-2 focus:outline-none focus:border-brand"
          >
            <option value="yuksek">🔴 Yüksek</option>
            <option value="orta">🟡 Orta</option>
            <option value="dusuk">🔵 Düşük</option>
          </select>

          {/* Due Date */}
          <div className="min-h-[40px] flex items-center gap-1.5 bg-surface-2 border border-line-strong rounded-lg px-2.5 py-1.5 text-xs text-subtle">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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
            className="min-h-[40px] px-4 py-2 bg-brand hover:bg-brand-hover active:bg-brand-active text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Görev Ekle</span>
          </button>
        </form>

        {/* Filter Bar & Search */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          {/* Tabs */}
          <div className="flex bg-surface p-1 rounded-lg border border-line gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeFilter === 'all' ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
              }`}
            >
              Tümü ({tasks.length})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeFilter === 'pending' ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
              }`}
            >
              Bekleyen ({tasks.filter(t => !t.completed).length})
            </button>
            <button
              onClick={() => setActiveFilter('high')}
              className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeFilter === 'high' ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
              }`}
            >
              Yüksek Öncelik ({tasks.filter(t => getEffectiveTaskPriority(t) === 'yuksek' && !t.completed).length})
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeFilter === 'completed' ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
              }`}
            >
              Tamamlananlar ({completedCount})
            </button>
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Görevlerde ara..."
              className="w-full min-h-[38px] bg-surface border border-line focus:border-brand rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-muted focus:outline-none"
            />
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-surface border border-line rounded-xl sm:rounded-xl p-5 sm:p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-emerald-400 mx-auto">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {tasks.length === 0 ? 'Henüz Kayıtlı Bir Görev Bulunmuyor' : 'Seçili Filtrede Görev Bulunamadı'}
              </h3>
              <p className="text-xs text-subtle max-w-sm mx-auto leading-relaxed">
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
