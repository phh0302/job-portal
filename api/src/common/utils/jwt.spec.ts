import { parseDuration, signJwt, verifyJwt } from './jwt';

describe('jwt', () => {
  const secret = 'test_secret_test_secret_test_secret';

  it('ký và xác minh token hợp lệ', () => {
    const t = signJwt({ sub: 7, role: 'ADMIN' }, secret, 60);
    expect(verifyJwt(t, secret)).toMatchObject({ sub: 7, role: 'ADMIN' });
  });

  it('từ chối token sai chữ ký / bị sửa / sai secret', () => {
    const t = signJwt({ sub: 7, role: 'CANDIDATE' }, secret, 60);
    const [h, , s] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 7, role: 'ADMIN', exp: 9e9 })).toString('base64url');
    expect(verifyJwt(`${h}.${forged}.${s}`, secret)).toBeNull();
    expect(verifyJwt(t, 'other_secret')).toBeNull();
    expect(verifyJwt('abc', secret)).toBeNull();
  });

  it('từ chối token hết hạn', () => {
    const t = signJwt({ sub: 1, role: 'ADMIN' }, secret, -1);
    expect(verifyJwt(t, secret)).toBeNull();
  });

  it('từ chối alg khác HS256', () => {
    const h = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const b = Buffer.from(JSON.stringify({ sub: 1, role: 'ADMIN', exp: 9e9 })).toString('base64url');
    expect(verifyJwt(`${h}.${b}.`, secret)).toBeNull();
  });

  it('parseDuration', () => {
    expect(parseDuration('15m')).toBe(900);
    expect(parseDuration('7d')).toBe(604800);
    expect(parseDuration('30')).toBe(30);
    expect(() => parseDuration('abc')).toThrow();
  });
});
