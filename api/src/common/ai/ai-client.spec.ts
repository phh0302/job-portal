import { AiClient } from './ai-client';

const cfg = (values: Record<string, string | undefined>) => ({ get: (k: string) => values[k] }) as never;

describe('AiClient – chọn nhà cung cấp', () => {
  it('không có key, không cấu hình → tắt AI', () => {
    const ai = new AiClient(cfg({}));
    expect(ai.provider).toBeNull();
    expect(ai.enabled).toBe(false);
  });

  it('có ANTHROPIC_API_KEY → Claude, đọc được PDF', () => {
    const ai = new AiClient(cfg({ 'ai.apiKey': 'k', 'ai.model': 'claude-x' }));
    expect(ai.provider).toBe('anthropic');
    expect(ai.model).toBe('claude-x');
    expect(ai.supportsPdf).toBe(true);
  });

  it('AI_PROVIDER=ollama → không cần key, mô hình mặc định qwen2.5:7b, không đọc PDF', () => {
    const ai = new AiClient(cfg({ 'ai.provider': 'Ollama' }));
    expect(ai.provider).toBe('ollama');
    expect(ai.model).toBe('qwen2.5:7b');
    expect(ai.supportsPdf).toBe(false);
  });

  it('AI_PROVIDER=none → tắt dù có key', () => {
    expect(new AiClient(cfg({ 'ai.provider': 'none', 'ai.apiKey': 'k' })).enabled).toBe(false);
  });
});

describe('AiClient – gọi API', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('Ollama: gọi /api/chat, system thành tin nhắn đầu, bỏ khối PDF, ép JSON', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ message: { content: ' {"ok":1} ' } }) })) as never;
    const ai = new AiClient(cfg({ 'ai.provider': 'ollama', 'ai.ollamaUrl': 'http://may-ai:11434/', 'ai.ollamaModel': 'qwen2.5:3b' }));
    const text = await ai.complete({
      system: 'Bạn là trợ lý',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'AAA' } },
            { type: 'text', text: 'Chấm CV này' },
          ],
        },
      ],
      maxTokens: 100,
      timeoutMs: 1000,
      json: true,
    });
    expect(text).toBe('{"ok":1}');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, { body: string; headers: Record<string, string> }];
    expect(url).toBe('http://may-ai:11434/api/chat');
    expect(init.headers['x-api-key']).toBeUndefined();
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: 'qwen2.5:3b', stream: false, format: 'json', options: { num_predict: 100 } });
    expect(body.messages).toEqual([
      { role: 'system', content: 'Bạn là trợ lý' },
      { role: 'user', content: 'Chấm CV này' },
    ]);
  });

  it('Anthropic: giữ nguyên định dạng Messages API', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'Xin chào' }] }) })) as never;
    const ai = new AiClient(cfg({ 'ai.apiKey': 'sk-test', 'ai.model': 'claude-x' }));
    expect(await ai.complete({ system: 'S', messages: [{ role: 'user', content: 'Hi' }], maxTokens: 50, timeoutMs: 1000 })).toBe('Xin chào');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, { body: string; headers: Record<string, string> }];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('sk-test');
    expect(JSON.parse(init.body)).toEqual({ model: 'claude-x', max_tokens: 50, system: 'S', messages: [{ role: 'user', content: 'Hi' }] });
  });

  it('lỗi HTTP → ném lỗi để nơi gọi quay về chế độ không AI', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404, text: async () => 'model not found' })) as never;
    const ai = new AiClient(cfg({ 'ai.provider': 'ollama' }));
    await expect(ai.complete({ messages: [{ role: 'user', content: 'x' }], maxTokens: 10, timeoutMs: 10 })).rejects.toThrow('HTTP 404');
  });
});
