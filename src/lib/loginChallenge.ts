import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecretKey } from './jwtSecret';

// After a correct password, accounts with İki adımlı doğrulama get a short-lived, signed challenge
// instead of a session; the session is only issued once the authenticator code is checked.

const TYP = 'lr-2fa';
const TTL_SECONDS = 5 * 60;

export async function signLoginChallenge(userId: string, sv: number): Promise<string> {
  return new SignJWT({ typ: TYP, uid: userId, sv })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getJwtSecretKey());
}

export async function readLoginChallenge(token: unknown): Promise<{ userId: string; sv: number } | null> {
  if (typeof token !== 'string' || token.length > 2000) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ['HS256'] });
    if (payload.typ !== TYP || typeof payload.uid !== 'string' || typeof payload.sv !== 'number') return null;
    return { userId: payload.uid, sv: payload.sv };
  } catch {
    return null;
  }
}
