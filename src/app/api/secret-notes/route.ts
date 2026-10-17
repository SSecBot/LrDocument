import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AuthError, comparePassword, requireAuth } from '@/lib/auth';
import { handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { decryptText, encryptText } from '@/lib/dataCrypto';

// ---------------------------------------------------------------------------
// Gizli notlar. Notes are encrypted in the browser with a key derived from the vault password
// (src/lib/secretVault.ts); this route only stores ciphertext (encrypted once more at rest).
// Personal: a corporate member (signed in with a code) has no hidden notes in the shared space.
// ---------------------------------------------------------------------------

const MAX_NOTES = 5000;
const MAX_PAYLOAD = 1_500_000;
const cipher = z.string().regex(/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+$/).max(MAX_PAYLOAD);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const vaultSchema = z.object({
  salt: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  check: cipher.max(400),
  iterations: z.number().int().min(100_000).max(5_000_000),
});

async function owner() {
  const session = await requireAuth();
  if (session.memberId) throw new AuthError(403, 'Gizli notlar yalnızca kendi hesabınızda kullanılabilir.');
  return session;
}

export async function GET() {
  try {
    const { userId } = await owner();
    const [vault, notes] = await Promise.all([
      prisma.secretVault.findUnique({ where: { userId } }),
      prisma.secretNote.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
    ]);
    return NextResponse.json({
      vault: vault ? { salt: vault.salt, check: vault.check, iterations: vault.iterations } : null,
      notes: notes.map((n) => ({
        id: n.id,
        payload: decryptText(userId, n.payload),
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleRouteError(error, 'Secret notes load error', 'Gizli notlar yüklenemedi.');
  }
}

/**
 *  { action: 'setup', vault }                    → creates the vault (once)
 *  { action: 'save', id, payload }               → creates / updates a note
 *  { action: 'delete', id }
 *  { action: 'rekey', vault, notes: [{id, payload}] } → new password: every note re-encrypted at once
 *  { action: 'reset', password }                 → forgotten vault password: deletes the vault and all hidden notes
 */
export async function POST(req: Request) {
  try {
    const { userId } = await owner();
    const wait = rateLimit(`secret-notes:${userId}`, 300, 60_000);
    if (wait) return tooManyRequests(wait);
    const body = await readJsonObject(req, 8 * 1024 * 1024);
    const vault = await prisma.secretVault.findUnique({ where: { userId }, select: { userId: true } });

    if (body.action === 'setup') {
      const v = vaultSchema.safeParse(body.vault);
      if (!v.success) return NextResponse.json({ error: 'Geçersiz kasa bilgisi.' }, { status: 400 });
      if (vault) return NextResponse.json({ error: 'Gizli notlar şifresi zaten oluşturulmuş.' }, { status: 409 });
      await prisma.secretVault.create({ data: { userId, ...v.data } });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'reset') {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
      if (!(await comparePassword(body.password, user?.passwordHash))) {
        return NextResponse.json({ error: 'Hesap şifresi hatalı.' }, { status: 403 });
      }
      await prisma.$transaction([prisma.secretNote.deleteMany({ where: { userId } }), prisma.secretVault.deleteMany({ where: { userId } })]);
      return NextResponse.json({ success: true });
    }

    if (!vault) return NextResponse.json({ error: 'Önce gizli notlar şifresi oluşturun.' }, { status: 409 });

    if (body.action === 'save') {
      const noteId = id.safeParse(body.id);
      const payload = cipher.safeParse(body.payload);
      if (!noteId.success || !payload.success) return NextResponse.json({ error: 'Geçersiz not.' }, { status: 400 });
      const existing = await prisma.secretNote.findUnique({ where: { id: noteId.data }, select: { userId: true } });
      if (existing && existing.userId !== userId) return NextResponse.json({ error: 'Bu kayda erişim yetkiniz yok.' }, { status: 403 });
      if (!existing && (await prisma.secretNote.count({ where: { userId } })) >= MAX_NOTES) {
        return NextResponse.json({ error: 'Gizli not sınırına ulaşıldı.' }, { status: 409 });
      }
      const stored = encryptText(userId, payload.data);
      const row = await prisma.secretNote.upsert({
        where: { id: noteId.data },
        update: { payload: stored },
        create: { id: noteId.data, userId, payload: stored },
      });
      return NextResponse.json({ success: true, updatedAt: row.updatedAt.toISOString() });
    }

    if (body.action === 'delete') {
      const noteId = id.safeParse(body.id);
      if (!noteId.success) return NextResponse.json({ error: 'Geçersiz not.' }, { status: 400 });
      await prisma.secretNote.deleteMany({ where: { id: noteId.data, userId } });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'rekey') {
      const parsed = z
        .object({ vault: vaultSchema, notes: z.array(z.object({ id, payload: cipher })).max(MAX_NOTES) })
        .safeParse({ vault: body.vault, notes: body.notes });
      if (!parsed.success) return NextResponse.json({ error: 'Geçersiz veri.' }, { status: 400 });
      // Every stored note must come back re-encrypted; otherwise some would stay locked with the old password.
      const stored = await prisma.secretNote.findMany({ where: { userId }, select: { id: true } });
      const sent = new Set(parsed.data.notes.map((n) => n.id));
      if (stored.length !== sent.size || stored.some((n) => !sent.has(n.id))) {
        return NextResponse.json({ error: 'Notlar değişti; sayfayı yenileyip tekrar deneyin.' }, { status: 409 });
      }
      await prisma.$transaction([
        prisma.secretVault.update({ where: { userId }, data: parsed.data.vault }),
        ...parsed.data.notes.map((n) =>
          prisma.secretNote.update({ where: { id: n.id }, data: { payload: encryptText(userId, n.payload) } })
        ),
      ]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (error) {
    return handleRouteError(error, 'Secret notes error', 'Gizli not kaydedilemedi.');
  }
}
