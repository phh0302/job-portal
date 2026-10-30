import type { ConfigService } from '@nestjs/config';

/**
 * Lớp gọi mô hình AI dùng chung cho các tính năng AI (gợi ý việc làm, kiểm tra CV, chấm CV, trợ lý hỗ trợ).
 *
 * Nhà cung cấp (AI_PROVIDER):
 *  - "anthropic": Claude qua Anthropic Messages API – cần ANTHROPIC_API_KEY.
 *  - "ollama":    mô hình mở chạy ngay trên máy (https://ollama.com) – miễn phí, không cần key,
 *                 dữ liệu không rời máy chủ. Cấu hình OLLAMA_URL, OLLAMA_MODEL.
 *  - để trống:    tự chọn "anthropic" nếu có ANTHROPIC_API_KEY, ngược lại tắt AI (dùng so khớp từ khoá / FAQ).
 */
export type AiProvider = 'anthropic' | 'ollama';

export type AiContentBlock = { type: 'text'; text: string } | { type: 'document'; source: { type: 'base64'; media_type: string; data: string } };

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string | AiContentBlock[];
}

export interface AiRequest {
  system?: string;
  messages: AiMessage[];
  maxTokens: number;
  timeoutMs: number;
  /** Yêu cầu mô hình trả về JSON (Ollama hỗ trợ ép định dạng; Claude dựa vào lời nhắc) */
  json?: boolean;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_CLAUDE_MODEL = 'claude-haiku-5-5';
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen2.5:7b';
/** Mô hình chạy trên máy chậm hơn nhiều so với API → cho thời gian chờ tối thiểu dài hơn */
const OLLAMA_MIN_TIMEOUT_MS = 120_000;

export class AiClient {
  constructor(private readonly config: Pick<ConfigService, 'get'>) {}

  get provider(): AiProvider | null {
    const p = (this.config.get<string>('ai.provider') ?? '').trim().toLowerCase();
    if (p === 'ollama') return 'ollama';
    if (p === 'none' || p === 'off') return null;
    return this.config.get<string>('ai.apiKey') ? 'anthropic' : null;
  }

  get enabled(): boolean {
    return this.provider !== null;
  }

  get model(): string {
    return this.provider === 'ollama'
      ? this.config.get<string>('ai.ollamaModel') || DEFAULT_OLLAMA_MODEL
      : this.config.get<string>('ai.model') || DEFAULT_CLAUDE_MODEL;
  }

  /** Claude đọc được file PDF đính kèm; mô hình trên máy chỉ nhận chữ (dùng nội dung PDF đã trích) */
  get supportsPdf(): boolean {
    return this.provider === 'anthropic';
  }

  async complete(req: AiRequest): Promise<string> {
    const provider = this.provider;
    if (!provider) throw new Error('AI đang tắt');
    return provider === 'ollama' ? this.ollama(req) : this.anthropic(req);
  }

  private async anthropic(req: AiRequest): Promise<string> {
    const body = await this.post(
      this.config.get<string>('ai.baseUrl') || ANTHROPIC_URL,
      {
        'x-api-key': this.config.get<string>('ai.apiKey')!,
        'anthropic-version': '2023-06-01',
      },
      {
        model: this.model,
        max_tokens: req.maxTokens,
        ...(req.system ? { system: req.system } : {}),
        messages: req.messages,
      },
      req.timeoutMs,
    );
    const content = (body as { content?: { type: string; text?: string }[] }).content ?? [];
    return content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');
  }

  private async ollama(req: AiRequest): Promise<string> {
    const base = (this.config.get<string>('ai.ollamaUrl') || DEFAULT_OLLAMA_URL).replace(/\/+$/, '');
    const messages = [
      ...(req.system ? [{ role: 'system', content: req.system }] : []),
      ...req.messages.map((m) => ({ role: m.role, content: toPlainText(m.content) })),
    ];
    const body = await this.post(
      `${base}/api/chat`,
      {},
      {
        model: this.model,
        stream: false,
        messages,
        ...(req.json ? { format: 'json' } : {}),
        options: { num_predict: req.maxTokens, temperature: 0.3 },
        keep_alive: '10m',
      },
      Math.max(req.timeoutMs, OLLAMA_MIN_TIMEOUT_MS),
    );
    return ((body as { message?: { content?: string } }).message?.content ?? '').trim();
  }

  private async post(url: string, headers: Record<string, string>, payload: unknown, timeoutMs: number): Promise<unknown> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Gộp các khối nội dung thành chữ thuần (bỏ file đính kèm – mô hình trên máy không đọc được PDF) */
function toPlainText(content: AiMessage['content']): string {
  if (typeof content === 'string') return content;
  return content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}
