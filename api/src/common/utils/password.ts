import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt) as (pwd: string, salt: string, keylen: number) => Promise<Buffer>;
const KEY_LEN = 64;

/** Băm mật khẩu bằng scrypt (có sẵn trong Node, không cần cài thêm). Kết quả: "scrypt$<salt>$<hash>" */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(plain, salt, KEY_LEN);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [algo, salt, hashHex] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(plain, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
