'use client';

import React, { useState, useRef } from 'react';
import { CalendarEvent } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import {
  Download,
  Calendar,
  ExternalLink,
  Upload,
  FileUp,
} from 'lucide-react';
import { downloadICSFile, createGoogleCalendarUrl } from '@/lib/icsExporter';
import { parseICS } from '@/lib/icsParser';

interface ExportSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent?: CalendarEvent | null;
}

export const ExportSyncModal: React.FC<ExportSyncModalProps> = ({
  isOpen,
  onClose,
  selectedEvent,
}) => {
  const { events, addEvent, addToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetEvents = selectedEvent ? [selectedEvent] : events;

  const handleDownloadAllICS = () => {
    downloadICSFile(events, 'lrdocument-tum-yayin-takvimi.ics');
    addToast({
      type: 'success',
      title: 'Tüm Takvim İndirildi (.ics)',
      message: 'iCalendar veya Google Takvim’e içe aktarabilirsiniz.',
    });
    onClose();
  };

  const handleDownloadSingleICS = () => {
    if (!selectedEvent) return;
    const filename = `${selectedEvent.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`;
    downloadICSFile([selectedEvent], filename);
    addToast({
      type: 'success',
      title: 'Etkinlik İndirildi (.ics)',
      message: `"${selectedEvent.title}" dosyası kaydedildi.`,
    });
    onClose();
  };

  const handleOpenGoogleCalendar = (ev: CalendarEvent) => {
    const url = createGoogleCalendarUrl(ev);
    window.open(url, '_blank');
    addToast({
      type: 'info',
      title: 'Google Takvim Açıldı',
      message: 'Etkinlik yeni sekmede Google Takvim’e aktarılıyor.',
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseICS(text);
        if (parsed.length === 0) {
          addToast({
            type: 'warning',
            title: 'Etkinlik Bulunamadı',
            message: 'Yüklenen .ics dosyasında geçerli VEVENT kaydı bulunamadı.',
          });
          return;
        }

        let addedCount = 0;
        for (const item of parsed) {
          addEvent(item);
          addedCount++;
        }

        addToast({
          type: 'success',
          title: 'Takvim İçe Aktarıldı',
          message: `${addedCount} adet takvim etkinliği başarıyla takviminize eklendi.`,
        });
        onClose();
      } catch {
        addToast({
          type: 'error',
          title: 'İçe Aktarma Hatası',
          message: 'Dosya okunurken bir hata oluştu. Lütfen geçerli bir .ics dosyası seçin.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Takvim Senkronizasyonu & .ICS İçe/Dışa Aktarım"
      subtitle="iCalendar (.ics), Google Takvim veya Outlook ile takviminizi senkronize edin."
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* Tab switchers */}
        <div className="flex bg-[#202020] p-1 rounded-xl border border-[#333]">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'export' ? 'bg-[#2d5a27] text-white shadow-sm' : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Dışa Aktar (.ICS & Google)</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'import' ? 'bg-[#2d5a27] text-white shadow-sm' : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>.ICS Dosyası Yükle</span>
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="space-y-4">
            {/* General Calendar .ics option */}
            <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-4 sm:p-5 space-y-3 hover:border-[#2d5a27] transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#202020] border border-[#333] text-white">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Standart iCalendar (.ics) Dosyası</h4>
                    <p className="text-xs text-[#9ca3af] mt-0.5">
                      iCalendar, Microsoft Outlook ve Google Takvim ile tam uyumlu RFC 5545 formatı.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 flex-wrap">
                {selectedEvent ? (
                  <button
                    onClick={handleDownloadSingleICS}
                    className="min-h-[44px] px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Bu Etkinliği İndir (.ics)</span>
                  </button>
                ) : null}

                <button
                  onClick={handleDownloadAllICS}
                  className="min-h-[44px] px-4 py-2 bg-[#202820] hover:bg-[#2d5a27]/30 border border-[#2d5a27]/50 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tüm Takvimi İndir ({events.length} Yayın)</span>
                </button>
              </div>
            </div>

            {/* Google Calendar Direct Web Sync */}
            <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-4 sm:p-5 space-y-3 hover:border-[#2d5a27] transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#142028] border border-[#1e3a4e] text-sky-400">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Google Takvim'e Doğrudan Ekle</h4>
                  <p className="text-xs text-[#9ca3af] mt-0.5">
                    Tarayıcınızda doğrudan Google Takvim etkinlik oluşturma ekranını açar.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 max-h-48 overflow-y-auto pr-1">
                {targetEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#202020] border border-[#2c2c2c]"
                  >
                    <div className="truncate flex-1 mr-3">
                      <span className="text-xs font-semibold text-white block truncate">{ev.title}</span>
                      <span className="text-[10px] text-[#71717a]">{ev.date} {ev.time || '09:00'} • {ev.platform}</span>
                    </div>
                    <button
                      onClick={() => handleOpenGoogleCalendar(ev)}
                      className="min-h-[36px] px-3 py-1.5 bg-[#1a2d3d] hover:bg-[#24425a] text-sky-300 border border-sky-800/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                    >
                      <span>Google'a Aktar</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Import .ICS Section */
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".ics,text/calendar"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#387030] hover:border-emerald-400 bg-[#162216]/50 hover:bg-[#1c2e1c]/60 rounded-3xl p-8 text-center space-y-3 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <FileUp className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">.ICS Dosyasını Seçin veya Sürükleyin</h4>
                <p className="text-xs text-[#9ca3af] mt-1 max-w-sm mx-auto">
                  Standart <strong>.ics</strong> takvim dosyasını yükleyin.
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-md"
              >
                <Upload className="w-4 h-4" />
                <span>Dosya Seç</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
