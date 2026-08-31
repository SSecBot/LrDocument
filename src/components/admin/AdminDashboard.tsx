'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  Download,
  CreditCard,
  Plus,
  X,
  Lock,
  Mail,
  User,
  Shield,
  Layers,
  Database,
  UploadCloud,
  Archive,
} from 'lucide-react';
import { AdminUserItem, AdminMetrics, SubscriptionPlan, UserRole, UserStatus } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { exportUsersToExcel, exportUsersToCSV } from '@/lib/exportExcel';
import { SigmaLogo } from '@/components/ui/SigmaLogo';

export function AdminDashboard() {
  const { addToast, currentUser } = useAppStore();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // New User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('USER');
  const [newUserPlan, setNewUserPlan] = useState<SubscriptionPlan>('Aylık');
  const [newUserStatus, setNewUserStatus] = useState<UserStatus>('APPROVED');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Veriler alınamadı.');
      }

      setUsers(data.users || []);
      setMetrics(data.metrics || null);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Veri Yükleme Hatası',
        message: err.message || 'Yönetici paneli verileri alınamadı.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportFullBackup = async () => {
    try {
      setIsExporting(true);
      const res = await fetch('/api/admin/export-data');
      if (!res.ok) throw new Error('Veritabanı yedeği alınamadı.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lrdocument_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Yedekleme Tamamlandı',
        message: 'Tüm sistem veritabanı JSON formatında başarıyla dışa aktarıldı.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Yedekleme Hatası',
        message: err.message || 'Yedek indirilirken bir hata oluştu.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFullBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Seçilen JSON yedekleme dosyası mevcut veritabanı ile güvenli şekilde birleştirilecektir. Devam etmek istiyor musunuz?')) {
      e.target.value = '';
      return;
    }

    try {
      setIsImporting(true);
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch('/api/admin/import-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İçe aktarım başarısız oldu.');

      addToast({
        type: 'success',
        title: 'Veri İçe Aktarımı Başarılı',
        message: `Yedekleme içeri aktarıldı. (${data.summary?.importedUsers ?? 0} kullanıcı, ${data.summary?.importedNotes ?? 0} not, ${data.summary?.importedTransactions ?? 0} finans kaydı).`,
      });

      await fetchAdminData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'İçe Aktarım Hatası',
        message: err.message || 'Yedek dosyası işlenirken hata oluştu.',
      });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      exportUsersToExcel(users, `lrdocument_kullanicilar_${new Date().toISOString().slice(0, 10)}`);
      addToast({
        type: 'success',
        title: 'Dışa Aktarma Başarılı',
        message: 'Kullanıcı listesi Excel (.xlsx) formatında indirildi.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Excel Dışa Aktarma Hatası',
        message: err.message || 'Dosya oluşturulurken hata meydana geldi.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      exportUsersToCSV(users, `lrdocument_kullanicilar_${new Date().toISOString().slice(0, 10)}`);
      addToast({
        type: 'success',
        title: 'Dışa Aktarma Başarılı',
        message: 'Kullanıcı listesi CSV formatında indirildi.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'CSV Dışa Aktarma Hatası',
        message: err.message || 'Dosya oluşturulurken hata meydana geldi.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleApprove = async (user: AdminUserItem) => {
    try {
      setActionLoadingId(user.id);
      const res = await fetch(`/api/admin/users/${user.id}/approve`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Onaylama başarısız.');

      addToast({
        type: 'success',
        title: 'Kayıt Onaylandı',
        message: `${user.name} (${user.email}) hesabı başarıyla onaylandı.`,
      });
      await fetchAdminData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'İşlem Başarısız',
        message: err.message,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (user: AdminUserItem) => {
    try {
      setActionLoadingId(user.id);
      const res = await fetch(`/api/admin/users/${user.id}/reject`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reddetme başarısız.');

      addToast({
        type: 'warning',
        title: 'Kayıt Reddedildi',
        message: `${user.name} kullanıcısının erişim talebi reddedildi.`,
      });
      await fetchAdminData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'İşlem Başarısız',
        message: err.message,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdatePlan = async (user: AdminUserItem, newPlan: SubscriptionPlan) => {
    try {
      setActionLoadingId(user.id);
      const res = await fetch(`/api/admin/users/${user.id}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionPlan: newPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Paket güncellenemedi.');

      addToast({
        type: 'success',
        title: 'Abonelik Paketi Güncellendi',
        message: `${user.name} kullanıcısının paketi "${newPlan}" olarak ayarlandı.`,
      });
      await fetchAdminData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Hata',
        message: err.message,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleRole = async (user: AdminUserItem) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (user.id === currentUser?.id && newRole === 'USER') {
      addToast({
        type: 'warning',
        title: 'İşlem Engellendi',
        message: 'Kendi yöneticilik yetkinizi kaldıramazsınız.',
      });
      return;
    }

    try {
      setActionLoadingId(user.id);
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rol güncelleme başarısız.');

      addToast({
        type: 'info',
        title: 'Rol Güncellendi',
        message: `${user.name} kullanıcısının rolü "${newRole}" yapıldı.`,
      });
      await fetchAdminData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Hata',
        message: err.message,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUserItem) => {
    if (!confirm(`${user.name} (${user.email}) kullanıcısını ve ilişkili tüm verilerini silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      setActionLoadingId(user.id);
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kullanıcı silinemedi.');

      addToast({
        type: 'success',
        title: 'Kullanıcı Silindi',
        message: `${user.name} kullanıcısı sistemden tamamen kaldırıldı.`,
      });
      await fetchAdminData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Hata',
        message: err.message,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) {
      addToast({
        type: 'warning',
        title: 'Eksik Bilgi',
        message: 'Lütfen tüm zorunlu alanları doldurunuz.',
      });
      return;
    }

    if (newUserPassword.length < 6) {
      addToast({
        type: 'warning',
        title: 'Geçersiz Şifre',
        message: 'Şifre en az 6 karakter olmalıdır.',
      });
      return;
    }

    try {
      setIsCreatingUser(true);
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.toLowerCase().trim(),
          password: newUserPassword,
          role: newUserRole,
          subscriptionPlan: newUserPlan,
          status: newUserStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kullanıcı oluşturulamadı.');

      addToast({
        type: 'success',
        title: 'Kullanıcı Oluşturuldu',
        message: `${newUserName} hesabı başarıyla eklendi (${newUserStatus === 'APPROVED' ? 'Aktif' : 'Onay Bekliyor'}).`,
      });

      setIsCreateModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      await fetchAdminData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Oluşturma Hatası',
        message: err.message || 'Kullanıcı eklenemedi.',
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const pendingUsers = users.filter((u) => u.status === 'PENDING');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121318] text-[#f5f5f0] overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-[#161820]/80 backdrop-blur-md px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <SigmaLogo size="md" />
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Yönetici Kontrol Paneli
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-medium">
                Admin Panel
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Kullanıcı kayıt onayları, abonelik paketleri ve merkezi yönetim
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* New User Modal Trigger */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kullanıcı Ekle</span>
          </button>

          {/* Full Database JSON Backup Export */}
          <button
            onClick={handleExportFullBackup}
            disabled={isExporting}
            title="Tüm Veritabanını JSON Olarak Yedekle (Kullanıcılar, Notlar, Finans, Görevler)"
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-950/40 border border-blue-500/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Database className="w-4 h-4 text-blue-300" />
            <span>{isExporting ? 'Yedekleniyor...' : 'Veritabanı Yedeği (.json)'}</span>
          </button>

          {/* Full Database JSON Backup Import */}
          <label
            title="Daha önce alınmış JSON yedeğini sisteme güvenli şekilde geri yükleyin / aktarın"
            className={`px-3.5 py-2.5 rounded-xl bg-[#1c2230] hover:bg-[#252e42] text-xs font-semibold text-blue-300 border border-blue-800/60 flex items-center gap-1.5 transition-colors cursor-pointer ${
              isImporting ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <UploadCloud className="w-4 h-4 text-blue-400" />
            <span>{isImporting ? 'İçe Aktarılıyor...' : 'Yedek Yükle'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFullBackup}
              className="hidden"
            />
          </label>

          {/* Prominent Excel Export Button */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting || users.length === 0}
            title="Kullanıcı Listesini Excel Olarak İndir (.xlsx)"
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* CSV Export Option */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting || users.length === 0}
            title="CSV Formatında İndir"
            className="px-3 py-2.5 rounded-xl bg-[#1c1f2a] hover:bg-[#252a3a] text-xs font-semibold text-neutral-300 border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.CSV</span>
          </button>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 border border-neutral-700 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        {/* Database Migration & Backup Status Banner */}
        <div className="bg-gradient-to-r from-[#141a24] to-[#121620] border border-blue-900/40 rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Veri Koruma & Otomatik Geçiş Sistemi (Schema v2.0)</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-semibold">
                  Sıfır Veri Kaybı Aktif
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Mevcut veriler: {metrics?.totalUsers ?? users.length} Kullanıcı, {metrics?.totalNotes ?? 0} Not, {metrics?.totalTasks ?? 0} Görev, {metrics?.totalScripts ?? 0} Senaryo. Yapısal değişiklik öncesi tam JSON yedeği alabilirsiniz.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportFullBackup}
              disabled={isExporting}
              className="px-3 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Yedek İndir (.json)</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveTab('pending')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
                : 'bg-[#161820] border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Bekleyen Onaylar
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{metrics?.pendingCount ?? 0}</div>
            <p className="text-[11px] text-amber-400/80 mt-1 font-medium">Onay bekleyen kayıt talepleri</p>
          </div>

          <div
            onClick={() => {
              setActiveTab('all');
              setStatusFilter('APPROVED');
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'all' && statusFilter === 'APPROVED'
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                : 'bg-[#161820] border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Aktif Kullanıcılar
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{metrics?.approvedCount ?? 0}</div>
            <p className="text-[11px] text-emerald-400/80 mt-1 font-medium">Sisteme erişebilen üyeler</p>
          </div>

          <div
            onClick={() => {
              setActiveTab('all');
              setStatusFilter('ALL');
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'all' && statusFilter === 'ALL'
                ? 'bg-neutral-800/40 border-neutral-600'
                : 'bg-[#161820] border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Toplam Kayıt
              </span>
              <div className="w-8 h-8 rounded-xl bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{metrics?.totalUsers ?? 0}</div>
            <p className="text-[11px] text-neutral-400 mt-1 font-medium">Veritabanındaki toplam kullanıcı</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#161820] border border-neutral-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Üretim Verileri
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white">
              {(metrics?.totalNotes ?? 0) + (metrics?.totalTasks ?? 0) + (metrics?.totalScripts ?? 0)}
            </div>
            <p className="text-[11px] text-purple-400/80 mt-1 font-medium">Not, senaryo ve görev toplamı</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Bekleyen Onay Talepleri ({pendingUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tüm Kullanıcılar ({users.length})</span>
          </button>
        </div>

        {/* TAB 1: PENDING USERS CARDS */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-16 bg-[#161820] border border-neutral-800 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-white">Bekleyen Talep Yok</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  Tüm kayıt başvuruları işlenmiştir. Yeni kayıt olan kullanıcılar onaylanana kadar burada listelenecektir.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-5 rounded-2xl bg-[#161820] border border-amber-500/30 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-4 shadow-lg shadow-black/20"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          ONAY BEKLİYOR
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          {new Date(user.createdAt).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{user.name}</h3>
                      <p className="text-xs text-neutral-400 font-mono mt-0.5">{user.email}</p>

                      {/* Subscription Plan Tag & Modifier */}
                      <div className="mt-3 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800">
                        <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Talep Edilen Plan:</span>
                        </span>
                        <select
                          value={user.subscriptionPlan || 'Aylık'}
                          onChange={(e) => handleUpdatePlan(user, e.target.value as SubscriptionPlan)}
                          className="bg-[#161820] border border-neutral-700 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-400 focus:outline-none"
                        >
                          <option value="Aylık">Aylık (100 TL)</option>
                          <option value="Tek Seferlik">Tek Seferlik (1999 TL)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-800/80 flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(user)}
                        disabled={actionLoadingId === user.id}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {actionLoadingId === user.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Onayla</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleReject(user)}
                        disabled={actionLoadingId === user.id}
                        className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Reddet</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ALL USERS TABLE */}
        {activeTab === 'all' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#161820] p-4 rounded-2xl border border-neutral-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="İsim veya e-posta ile ara..."
                  className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-[#0d0e12] border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Tüm Durumlar</option>
                  <option value="PENDING">Onay Bekleyenler</option>
                  <option value="APPROVED">Onaylananlar (Aktif)</option>
                  <option value="REJECTED">Reddedilenler</option>
                </select>
              </div>
            </div>

            <div className="bg-[#161820] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f1015] border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Kullanıcı</th>
                      <th className="p-4">Rol</th>
                      <th className="p-4">Abonelik Paketi</th>
                      <th className="p-4">Hesap Durumu</th>
                      <th className="p-4">Kayıt Tarihi</th>
                      <th className="p-4 text-center">Veri Sayısı</th>
                      <th className="p-4 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-500">
                          Aramaya uygun kullanıcı bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-neutral-800/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold flex items-center justify-center text-xs">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{user.name}</p>
                                <p className="text-[11px] text-neutral-500 font-mono">{user.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() => handleToggleRole(user)}
                              disabled={actionLoadingId === user.id}
                              title="Rolü Değiştir"
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                user.role === 'ADMIN'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                              }`}
                            >
                              {user.role}
                            </button>
                          </td>

                          {/* Subscription Plan Column */}
                          <td className="p-4">
                            <select
                              value={user.subscriptionPlan || 'Aylık'}
                              disabled={actionLoadingId === user.id}
                              onChange={(e) => handleUpdatePlan(user, e.target.value as SubscriptionPlan)}
                              className={`text-[11px] font-semibold rounded-lg px-2 py-1 border transition-colors cursor-pointer focus:outline-none ${
                                user.subscriptionPlan === 'Tek Seferlik'
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                                  : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                              }`}
                            >
                              <option value="Aylık">Aylık (100 TL)</option>
                              <option value="Tek Seferlik">Tek Seferlik (1999 TL)</option>
                            </select>
                          </td>

                          <td className="p-4">
                            {user.status === 'APPROVED' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Onaylı
                              </span>
                            )}
                            {user.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                <Clock className="w-3 h-3" /> Bekliyor
                              </span>
                            )}
                            {user.status === 'REJECTED' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <XCircle className="w-3 h-3" /> Reddedildi
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-neutral-400">
                            {new Date(user.createdAt).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          <td className="p-4 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 text-[11px]">
                              {(user._count?.notes ?? 0) +
                                (user._count?.tasks ?? 0) +
                                (user._count?.scripts ?? 0)}{' '}
                              öğe
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {user.status === 'PENDING' && (
                                <button
                                  onClick={() => handleApprove(user)}
                                  disabled={actionLoadingId === user.id}
                                  title="Onayla"
                                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {user.status === 'PENDING' && (
                                <button
                                  onClick={() => handleReject(user)}
                                  disabled={actionLoadingId === user.id}
                                  title="Reddet"
                                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {user.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  disabled={actionLoadingId === user.id}
                                  title="Kullanıcıyı Sil"
                                  className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE NEW USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#161822] border border-neutral-800 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-7 shadow-2xl relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Yeni Kullanıcı Ekle</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Yönetici olarak doğrudan aktif veya onay bekleyen kullanıcı tanımlayın.
              </p>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Ad Soyad</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Örn: Mehmet Demir"
                    className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">E-Posta Adresi</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="mehmet@alanadi.com"
                    className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Şifre (En az 6 karakter)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Kullanıcı Rolü</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="USER">USER (Standart)</option>
                    <option value="ADMIN">ADMIN (Yönetici)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Abonelik Paketi</label>
                  <select
                    value={newUserPlan}
                    onChange={(e) => setNewUserPlan(e.target.value as SubscriptionPlan)}
                    className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Aylık">Aylık (100 TL)</option>
                    <option value="Tek Seferlik">Tek Seferlik (1999 TL)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Başlangıç Durumu</label>
                <select
                  value={newUserStatus}
                  onChange={(e) => setNewUserStatus(e.target.value as UserStatus)}
                  className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="APPROVED">Onaylı (Hemen Giriş Yapabilir)</option>
                  <option value="PENDING">Bekliyor (Onay Gerektirir)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCreatingUser ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Kullanıcıyı Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
