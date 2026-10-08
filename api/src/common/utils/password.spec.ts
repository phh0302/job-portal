import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('băm và kiểm tra mật khẩu', async () => {
    const h = await hashPassword('Matkhau123');
    expect(h).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword('Matkhau123', h)).toBe(true);
    expect(await verifyPassword('matkhau123', h)).toBe(false);
  });

  it('mỗi lần băm cho kết quả khác nhau (salt ngẫu nhiên)', async () => {
    expect(await hashPassword('abc12345')).not.toBe(await hashPassword('abc12345'));
  });

  it('chuỗi hash sai định dạng -> false', async () => {
    expect(await verifyPassword('x', 'bcrypt$abc')).toBe(false);
  });
});
