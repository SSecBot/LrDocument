'use client';

import { t as tl, tx } from '@/lib/i18n';
import React from 'react';
import { Kanban, ListChecks } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { TasksWorkspace } from './TasksWorkspace';
import { KanbanWorkspace } from '@/components/kanban/KanbanWorkspace';

/** Görevler: the task list and the Kanban board on one page, switched with a segmented control. */
export function WorkWorkspace() {
  const { preferences, setPreference, tasks, kanbanCards } = useAppStore();
  const view = preferences.tasksView;
  const openTasks = tasks.filter((t) => !t.completed).length;
  const openCards = kanbanCards.filter((c) => c.columnId !== 'tamamlandi').length;

  const tabs = [
    { id: 'liste' as const, label: tl('Liste'), icon: ListChecks, count: openTasks },
    { id: 'pano' as const, label: tl('Pano'), icon: Kanban, count: openCards },
  ];

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
      <div className="h-11 shrink-0 px-4 sm:px-6 border-b border-line bg-surface flex items-center">
        <div className="inline-flex rounded-md border border-line bg-surface-2 p-0.5" role="tablist" aria-label={tl('Görünüm')}>
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              onClick={() => setPreference('tasksView', id)}
              className={`h-7 px-3 rounded text-[12px] inline-flex items-center gap-1.5 transition-colors ${
                view === id ? 'bg-surface-4 text-fg' : 'text-subtle hover:text-fg'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tx(label)}
              {count > 0 && <span className="tabular-nums text-muted">{count}</span>}
            </button>
          ))}
        </div>
      </div>
      {view === 'pano' ? <KanbanWorkspace /> : <TasksWorkspace />}
    </div>
  );
}
