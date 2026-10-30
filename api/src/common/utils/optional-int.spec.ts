import 'reflect-metadata';
import { plainToInstance, Transform } from 'class-transformer';
import { toOptionalInt } from './optional-int';

class Dto {
  @Transform(toOptionalInt)
  n?: unknown;
}

describe('toOptionalInt', () => {
  it.each([
    ['', null],
    ['  ', null],
    [null, null],
    ['12', 12],
    [' 7 ', 7],
    [5, 5],
    ['1.5', '1.5'],
    ['abc', 'abc'],
  ])('%p -> %p', (input, expected) => {
    expect(plainToInstance(Dto, { n: input }).n).toEqual(expected);
  });

  it('giữ undefined khi không gửi trường', () => {
    expect(plainToInstance(Dto, {}).n).toBeUndefined();
  });
});
