'use client';

import React, { useState } from 'react';
import { FinanceCategoryItem, FinanceTransactionType } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    financeCategories,
    addFinanceCategory,
    updateFinanceCategory,
    deleteFinanceCategory,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<FinanceTransactionType>('gelir');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const currentCategories = financeCategories.filter(c => c.type === activeTab);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    addFinanceCategory(newCategoryName.trim(), activeTab);
    setNewCategoryName('');
  };

  const handleStartEdit = (cat: FinanceCategoryItem) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateFinanceCategory(id, editName.trim());
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Finans Kategori Yönetimi"
      subtitle="Gelir ve gider işlemleriniz için özel kategori etiketleri oluşturun, düzenleyin veya silin."
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Type Toggle Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#202020] p-1 rounded-xl border border-[#333]">
          <button
            type="button"
            onClick={() => setActiveTab('gelir')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'gelir'
                ? 'bg-[#182818] border border-[#2d5a27] text-emerald-300 shadow-sm'
                : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gelir Kategorileri</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gider')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'gider'
                ? 'bg-[#28181a] border border-rose-800/80 text-rose-300 shadow-sm'
                : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Gider Kategorileri</span>
          </button>
        </div>

        {/* Add New Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={`+ Yeni ${activeTab === 'gelir' ? 'gelir' : 'gider'} kategorisi adı...`}
            className="flex-1 bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#71717a] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newCategoryName.trim()}
            className="px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] disabled:opacity-30 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ekle</span>
          </button>
        </form>

        {/* Category List */}
        <div className="border border-[#282828] bg-[#1a1a1a] rounded-2xl p-2 max-h-64 overflow-y-auto space-y-1.5 divide-y divide-[#242424]">
          {currentCategories.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#71717a]">
              Bu türde kayıtlı kategori bulunamadı.
            </div>
          ) : (
            currentCategories.map((cat) => (
              <div
                key={cat.id}
                className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 px-2 py-1 hover:bg-[#202020] rounded-lg transition-colors"
              >
                {editingId === cat.id ? (
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-[#282828] border border-[#387030] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
                      className="p-1.5 bg-[#2d5a27] hover:bg-[#387030] text-white rounded-lg text-xs"
                      title="Kaydet"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="p-1.5 bg-[#282828] hover:bg-[#333] text-[#9ca3af] rounded-lg text-xs"
                      title="İptal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Tag className={`w-3.5 h-3.5 ${activeTab === 'gelir' ? 'text-emerald-400' : 'text-rose-400'}`} />
                      <span className="text-xs font-semibold text-white">{cat.name}</span>
                      {cat.isSystem && (
                        <span className="text-[9px] bg-[#282828] text-[#71717a] px-1.5 py-0.2 rounded font-mono">
                          Varsayılan
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 hover:bg-[#282828] text-[#71717a] hover:text-white rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFinanceCategory(cat.id)}
                        className="p-1.5 hover:bg-rose-950/50 text-[#71717a] hover:text-rose-400 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[#262626]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#242424] hover:bg-[#2c2c2c] text-xs font-medium text-white rounded-xl transition-colors"
          >
            Tamam
          </button>
        </div>
      </div>
    </Modal>
  );
};
