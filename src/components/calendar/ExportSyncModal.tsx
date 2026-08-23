'use client';

import React from 'react';
import { CalendarEvent } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { downloadICSFile, createGoogleCalendarUrl } from '@/lib/icsExporter';
import {
  Calendar,
  Download,
  ExternalLink,
  Apple,
  CheckCircle2,
  Share2,
  Sparkles,
} from 'lucide-react';

interface ExportSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent?: CalendarEvent;
}

export const ExportSyncModal: React.FC<ExportSyncModalProps> = ({
  isOpen,
  onClose,
  selectedEvent,
}) => {
  const { events, addToast } = useAppStore();

  const targetEvents = selectedEvent ? [selectedEvent] : events;

  const handleDownloadAllICS = () => {
    downloadICSFile(events, 'lrdocument-tum-yayin-takvimi.ics');
    addToast({
      type: 'success',
      title: 'Tüm Takvim İndirildi (.ics)',
      message: 'Apple Takvim veya Google Takvim’e içe aktarabilirsiniz.',
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Takvim Dışa Aktarma & Senkronizasyon"
      subtitle="Apple Takvim, Google Takvim veya Outlook ile tek tıkla senkronize edin."
    >
      <div className="space-y-6">
        {/* Apple & General Calendar .ics option */}
        <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-5 space-y-3 hover:border-[#2d5a27] transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#202020] border border-[#333] text-white">
                <Calendar className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Standart iCalendar (.ics) Dosyası</h4>
                <p className="text-xs text-[#9ca3af] mt-0.5">
                  Apple Calendar (macOS & iOS), Microsoft Outlook ve Google Takvim içe aktarmalarıyla tam uyumlu RFC 5545 formatı.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {selectedEvent ? (
              <button
                onClick={handleDownloadSingleICS}
                className="px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Bu Etkinliği İndir (.ics)</span>
              </button>
            ) : null}

            <button
              onClick={handleDownloadAllICS}
              className="px-4 py-2 bg-[#202820] hover:bg-[#2d5a27]/30 border border-[#2d5a27]/50 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Tüm Takvimi İndir ({events.length} Yayın)</span>
            </button>
          </div>
        </div>

        {/* Google Calendar Direct Web Sync */}
        <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-5 space-y-3 hover:border-[#2d5a27] transition-colors">
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
                  className="px-3 py-1.5 bg-[#1a2d3d] hover:bg-[#24425a] text-sky-300 border border-sky-800/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <span>Google'a Aktar</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#222] hover:bg-[#2c2c2c] text-xs font-medium text-[#d1d5db] rounded-xl transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </Modal>
  );
};
