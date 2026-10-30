import { aiLike, likeEscape, searchKeyword } from './search';

describe('search utils', () => {
  it('escape ký tự đại diện của LIKE', () => {
    expect(likeEscape('50%_[a]')).toBe('50[%][_][[]a[]]');
  });
  it('từ khoá: trim, đổi đ→d, bọc %', () => {
    expect(searchKeyword('  Đà Nẵng ')).toBe('%Dà Nẵng%');
  });
  it('biểu thức so khớp không dấu', () => {
    expect(aiLike('j.title')).toBe("REPLACE(REPLACE(j.title, N'đ', N'd'), N'Đ', N'D') COLLATE Latin1_General_100_CI_AI LIKE :kw");
  });
});
