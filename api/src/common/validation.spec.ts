import { ValidationError } from '@nestjs/common';
import { validationMessages } from './validation';

const err = (property: string, constraints: Record<string, string>, children: ValidationError[] = []): ValidationError =>
  ({ property, constraints, children }) as ValidationError;

describe('validationMessages', () => {
  it('thiếu trường: chỉ giữ câu tiếng Việt, bỏ câu mặc định tiếng Anh (BUG-06)', () => {
    const msgs = validationMessages([
      err('reason', {
        maxLength: 'reason must be shorter than or equal to 500 characters',
        isNotEmpty: 'Vui lòng nhập lý do',
        isString: 'reason must be a string',
      }),
    ]);
    expect(msgs).toEqual(['Vui lòng nhập lý do']);
  });

  it('trường chỉ có câu mặc định thì giữ nguyên', () => {
    expect(validationMessages([err('foo', { whitelistValidation: 'property foo should not exist' })])).toEqual([
      'property foo should not exist',
    ]);
  });

  it('lỗi lồng nhau vẫn được trả về', () => {
    const msgs = validationMessages([
      err('interview', {}, [err('time', { isNotEmpty: 'Vui lòng nhập thời gian phỏng vấn' })]),
    ]);
    expect(msgs).toEqual(['Vui lòng nhập thời gian phỏng vấn']);
  });
});
