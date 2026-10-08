import { AiExplainerService, AiJobInput } from './ai-explainer.service';

const cfg = (apiKey?: string) => ({ get: (k: string) => ({ 'ai.apiKey': apiKey, 'ai.model': 'claude-haiku-5-5' } as Record<string, unknown>)[k] }) as never;
const jobs: AiJobInput[] = [1, 2].map((id) => ({
  jobId: id, title: `Job ${id}`, company: 'ABC', location: 'Hà Nội', salary: '15-25 triệu', experienceYears: 1,
  skills: ['React'], matchedSkills: ['React'], missingSkills: [], score: 90, description: 'Mô tả',
}));
const cand = { headline: 'Frontend', summary: null, yearsOfExperience: 2, skills: ['React'], location: 'Hà Nội', expectedSalaryMillion: 20 };

describe('AiExplainerService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('không có API key -> tắt, không gọi mạng', async () => {
    const spy = jest.spyOn(global, 'fetch');
    const s = new AiExplainerService(cfg());
    expect(s.enabled).toBe(false);
    expect(await s.explain(cand, jobs)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('parse: chỉ nhận jobId hợp lệ, bỏ mục thiếu lý do, chấp nhận chữ thừa quanh JSON', () => {
    const s = new AiExplainerService(cfg('k'));
    const r = s.parse(
      'Đây là kết quả:\n{"summary":"Bạn hợp Frontend","items":[{"jobId":1,"reason":"Có React","tip":null},{"jobId":999,"reason":"bịa"},{"jobId":2,"reason":""}]}',
      jobs,
    )!;
    expect(r.summary).toBe('Bạn hợp Frontend');
    expect(r.items).toEqual([{ jobId: 1, reason: 'Có React', tip: null }]);
    expect(s.parse('không phải json', jobs)).toBeNull();
  });

  it('gọi Claude đúng định dạng, gửi dữ liệu ẩn danh và cache kết quả', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: [{ type: 'text', text: '{"summary":"OK","items":[{"jobId":2,"reason":"Phù hợp","tip":"Học thêm TS"}]}' }] }), { status: 200 }),
    );
    const s = new AiExplainerService(cfg('sk-test'));
    const r1 = await s.explain(cand, jobs);
    const r2 = await s.explain(cand, jobs);
    expect(r1?.items[0]).toEqual({ jobId: 2, reason: 'Phù hợp', tip: 'Học thêm TS' });
    expect(r2).toBe(r1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.model).toBe('claude-haiku-5-5');
    expect(body.messages[0].content).not.toMatch(/@|email|phone|fullName/i);
  });

  it('API lỗi -> trả null (trang vẫn hiển thị đề xuất bằng thuật toán)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('overloaded', { status: 529 }));
    const s = new AiExplainerService(cfg('k'));
    expect(await s.explain(cand, jobs)).toBeNull();
  });
});
