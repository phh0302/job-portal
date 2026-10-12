import { responseInfo } from './response-stats';

describe('responseInfo', () => {
  it('ẩn khi chưa đủ 5 hồ sơ', () => {
    expect(responseInfo({ responseRate: 100, avgResponseHours: 2, responseSample: 4 })).toBeNull();
    expect(responseInfo({ responseRate: null, avgResponseHours: null, responseSample: 10 })).toBeNull();
  });

  it('"Phản hồi nhanh" khi ≥ 80% và trung bình ≤ 72 giờ', () => {
    expect(responseInfo({ responseRate: 85, avgResponseHours: 30, responseSample: 12 })).toEqual({ rate: 85, avgHours: 30, fast: true });
    expect(responseInfo({ responseRate: 79, avgResponseHours: 30, responseSample: 12 })?.fast).toBe(false);
    expect(responseInfo({ responseRate: 95, avgResponseHours: 80, responseSample: 12 })?.fast).toBe(false);
  });
});
