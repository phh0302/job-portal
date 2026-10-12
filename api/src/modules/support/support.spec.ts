import { UserRole } from '../../common/enums';
import { normalizeVi, searchFaqs, wantsHuman } from './faq-search';
import { SupportBotService } from './support-bot.service';

const FAQS = [
  { id: 1, question: 'Tôi quên mật khẩu thì làm thế nào?', answer: 'Bấm "Quên mật khẩu" ở trang đăng nhập.', keywords: 'quên mật khẩu, đặt lại mật khẩu' },
  { id: 2, question: 'Mua gói dịch vụ và thanh toán thế nào?', answer: 'Vào "Gói dịch vụ" và quét mã QR.', keywords: 'mua gói, thanh toán, chuyển khoản' },
  { id: 3, question: 'Làm sao rút đơn ứng tuyển?', answer: 'Vào "Việc đã ứng tuyển" → Rút đơn.', keywords: 'rút đơn, huỷ ứng tuyển' },
];

describe('faq-search', () => {
  it('bỏ dấu tiếng Việt', () => {
    expect(normalizeVi('Đổi Mật Khẩu!')).toBe('doi mat khau');
  });

  it('tìm đúng FAQ dù gõ không dấu', () => {
    expect(searchFaqs('quen mat khau dang nhap', FAQS)[0].faq.id).toBe(1);
    expect(searchFaqs('tôi muốn huỷ đơn đã ứng tuyển', FAQS)[0].faq.id).toBe(3);
    expect(searchFaqs('thanh toan chuyen khoan the nao', FAQS)[0].faq.id).toBe(2);
  });

  it('nhận ra yêu cầu gặp người thật', () => {
    expect(wantsHuman('cho mình gặp nhân viên với')).toBe(true);
    expect(wantsHuman('Toi muon noi chuyen voi admin')).toBe(true);
    expect(wantsHuman('quên mật khẩu')).toBe(false);
  });
});

describe('SupportBotService (không có API key)', () => {
  const bot = new SupportBotService({ get: () => undefined } as never);

  it('khớp FAQ → trả lời bằng nội dung FAQ', async () => {
    const r = await bot.reply(1, UserRole.CANDIDATE, [{ role: 'user', text: 'quên mật khẩu' }], FAQS);
    expect(r.source).toBe('faq');
    expect(r.text).toContain('Quên mật khẩu');
    expect(r.faqIds[0]).toBe(1);
    expect(r.handoff).toBe(false);
  });

  it('không khớp → xin mô tả thêm / gợi ý gặp nhân viên', async () => {
    const r = await bot.reply(1, UserRole.EMPLOYER, [{ role: 'user', text: 'xyz abc' }], FAQS);
    expect(r.text).toContain('Gặp nhân viên');
  });
});

describe('SupportBotService (có API key)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('AI yêu cầu chuyển nhân viên → handoff, không lộ mã đánh dấu', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'Mình sẽ nhờ nhân viên kiểm tra đơn của bạn. [[CHUYEN_NHAN_VIEN]]' }] }),
    })) as never;
    const bot = new SupportBotService({ get: (k: string) => (k === 'ai.apiKey' ? 'key' : undefined) } as never);
    const r = await bot.reply(2, UserRole.EMPLOYER, [{ role: 'user', text: 'đã chuyển khoản mà chưa kích hoạt' }], FAQS);
    expect(r).toMatchObject({ source: 'ai', handoff: true });
    expect(r.text).not.toContain('[[');
    const body = JSON.parse(((global.fetch as jest.Mock).mock.calls[0] as [string, { body: string }])[1].body);
    expect(body.system).toContain('Mua gói dịch vụ');
    expect(body.messages[0]).toEqual({ role: 'user', content: 'đã chuyển khoản mà chưa kích hoạt' });
  });

  it('AI lỗi → quay về FAQ', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, text: async () => 'err' })) as never;
    const bot = new SupportBotService({ get: (k: string) => (k === 'ai.apiKey' ? 'key' : undefined) } as never);
    const r = await bot.reply(3, UserRole.CANDIDATE, [{ role: 'user', text: 'rút đơn ứng tuyển' }], FAQS);
    expect(r.source).toBe('faq');
    expect(r.faqIds[0]).toBe(3);
  });
});
