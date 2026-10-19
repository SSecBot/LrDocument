import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';
import { decryptBytes, decryptRow, decryptText, type EncryptedModel } from '@/lib/dataCrypto';
import { packFile } from '@/lib/storedFiles';

/** Backups hold plain values so they can be restored on a server with a different key. */
const plain = <T extends { userId: string }>(model: EncryptedModel, rows: T[]) => rows.map((r) => decryptRow(model, r.userId, r));

export async function GET() {
  try {
    await requireAdmin();

    const [
      users,
      folders,
      notes,
      scripts,
      tasks,
      events,
      mediaItems,
      transactions,
      categories,
      kanbanCards,
      studentProfiles,
      customers,
      universityCalendars,
    ] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
        // UI preferences are device-independent conveniences, not part of the backup.
        // 2FA secrets are encrypted with this server's key and useless elsewhere; users set 2FA up again.
        omit: { preferences: true, twoFactorSecret: true, twoFactorPending: true, twoFactorRecovery: true, twoFactorLastStep: true },
      }),
      prisma.folder.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.note.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.script.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.task.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.calendarEvent.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.mediaItem.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.financeTransaction.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.financeCategory.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.kanbanCard.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.studentProfile.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.customer.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.universityCalendar.findMany(),
    ]);
    // PDF notes' files and Gizli notlar (still encrypted with the user's own vault password).
    const [files, secretVaults, secretNotes] = await Promise.all([
      prisma.storedFile.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.secretVault.findMany(),
      prisma.secretNote.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);
    // Files go into the backup Brotli-compressed ("encoding": "br"), so PDFs take less space there too.
    const storedFiles = [];
    for (const f of files) {
      let stored: Buffer;
      try {
        stored = decryptBytes(f.userId, Buffer.from(f.data));
      } catch {
        continue; // unreadable with this key: nothing to back up
      }
      const packed = f.compression === 'br' ? { data: stored, compression: 'br' as const } : await packFile(stored);
      const { data: _data, compression: _c, ...meta } = f;
      void _data;
      void _c;
      storedFiles.push({ ...meta, name: decryptText(f.userId, f.name), encoding: packed.compression, data: packed.data.toString('base64') });
    }

    const backupPayload = {
      version: '2.0.0',
      system: 'LrDocument Workspace Database Backup',
      exportedAt: new Date().toISOString(),
      summary: {
        totalUsers: users.length,
        totalFolders: folders.length,
        totalNotes: notes.length,
        totalScripts: scripts.length,
        totalTasks: tasks.length,
        totalEvents: events.length,
        totalMediaItems: mediaItems.length,
        totalTransactions: transactions.length,
        totalCategories: categories.length,
        totalKanbanCards: kanbanCards.length,
        totalStudentProfiles: studentProfiles.length,
        totalCustomers: customers.length,
      },
      data: {
        users,
        folders: plain('folder', folders),
        notes: plain('note', notes),
        scripts,
        tasks: plain('task', tasks),
        events: plain('calendarEvent', events),
        mediaItems,
        transactions: plain('financeTransaction', transactions),
        categories: plain('financeCategory', categories),
        kanbanCards: plain('kanbanCard', kanbanCards),
        studentProfiles: plain('studentProfile', studentProfiles),
        customers: plain('customer', customers),
        // Akademik takvimler published for universities (not personal data).
        universityCalendars,
        storedFiles,
        secretVaults,
        secretNotes: secretNotes.map((n) => ({ ...n, payload: decryptText(n.userId, n.payload) })),
      },
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lrdocument_backup_${dateStr}.json`;

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return handleRouteError(error, 'Data export error', 'Veritabanı yedeği alınırken bir hata oluştu.');
  }
}
