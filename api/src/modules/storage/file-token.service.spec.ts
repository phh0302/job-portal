import { FileTokenService } from './file-token.service';

const svc = new FileTokenService({ getOrThrow: () => 'secret_for_test_secret_for_test_123' } as never);
const tokenOf = (url: string) => url.split('/').pop()!;

describe('FileTokenService (signed URL)', () => {
  it('ký và xác minh link hợp lệ', () => {
    const { url } = svc.sign({ k: 'private/resumes/a.pdf', n: 'cv.pdf', u: 1 });
    expect(url).toMatch(/^\/api\/files\/signed\/[\w-]+\.[\w-]+$/);
    expect(svc.verify(tokenOf(url))).toMatchObject({ k: 'private/resumes/a.pdf', n: 'cv.pdf', u: 1 });
  });
  it('sửa nội dung token -> chữ ký sai', () => {
    const t = tokenOf(svc.sign({ k: 'private/resumes/a.pdf', n: 'cv.pdf', u: 1 }).url);
    const [, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ k: 'private/resumes/b.pdf', n: 'x', u: 1, e: 9e9 })).toString('base64url');
    expect(svc.verify(`${forged}.${sig}`)).toBeNull();
    expect(svc.verify('abc')).toBeNull();
  });
  it('link hết hạn -> từ chối', () => {
    const t = tokenOf(svc.sign({ k: 'private/resumes/a.pdf', n: 'cv.pdf', u: 1 }, -1).url);
    expect(svc.verify(t)).toBeNull();
  });
  it('không ký được file ngoài thư mục private', () => {
    const t = tokenOf(svc.sign({ k: '../.env', n: 'x', u: 1 }).url);
    expect(svc.verify(t)).toBeNull();
  });
});
