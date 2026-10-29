import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

function run(exception: unknown) {
  const json = jest.fn();
  const res = { headersSent: false, status: jest.fn(() => ({ json })) };
  const req = { url: '/api/auth/login', method: 'POST', id: 'req-1' };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: (res.status as jest.Mock).mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('AllExceptionsFilter', () => {
  it('body quá lớn từ body-parser -> 413, không phải 500 (BUG-11)', () => {
    const err = Object.assign(new Error('request entity too large'), { status: 413, statusCode: 413, expose: true, type: 'entity.too.large' });
    const { status, body } = run(err);
    expect(status).toBe(413);
    expect(body.message).toBe('Dữ liệu / file vượt quá dung lượng cho phép');
  });

  it('lỗi không xác định -> 500 với câu chung, không lộ chi tiết', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { status, body } = run(new Error('SELECT * FROM users – chi tiết nội bộ'));
    expect(status).toBe(500);
    expect(body.message).toBe('Lỗi máy chủ, vui lòng thử lại sau');
    expect(JSON.stringify(body)).not.toContain('SELECT');
  });

  it('HttpException giữ nguyên mã và câu thông báo', () => {
    const { status, body } = run(new BadRequestException('Email không hợp lệ'));
    expect(status).toBe(400);
    expect(body.message).toBe('Email không hợp lệ');
  });
});
