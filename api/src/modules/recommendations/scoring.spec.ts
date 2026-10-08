import { CandidateFeatures, JobFeatures, scoreJob, tokenize } from './scoring';

const cand = (o: Partial<CandidateFeatures> = {}): CandidateFeatures => ({
  skillIds: new Set([1, 2, 3]),
  headlineTokens: tokenize('Lập trình viên Frontend ReactJS'),
  locationId: 10,
  yearsOfExperience: 2,
  expectedSalary: 20_000_000,
  categoryAffinity: new Map([[100, 3]]),
  ...o,
});
const job = (o: Partial<JobFeatures> = {}): JobFeatures => ({
  id: 1,
  title: 'Frontend Developer (ReactJS)',
  skillIds: [1, 2],
  categoryIds: [100],
  locationId: 10,
  jobType: 'FULL_TIME',
  experienceYears: 1,
  salaryMin: 15_000_000,
  salaryMax: 25_000_000,
  salaryNegotiable: false,
  ...o,
});

describe('scoreJob', () => {
  it('tin khớp hoàn toàn được điểm rất cao', () => {
    const s = scoreJob(cand(), job());
    expect(s.total).toBeGreaterThanOrEqual(90);
    expect(s.matchedSkillIds).toEqual([1, 2]);
    expect(s.missingSkillIds).toEqual([]);
  });

  it('tin khác ngành, khác tỉnh, thiếu kỹ năng được điểm thấp', () => {
    const s = scoreJob(cand(), job({ title: 'Kế toán tổng hợp', skillIds: [7, 8], categoryIds: [200], locationId: 99, experienceYears: 5, salaryMax: 10_000_000 }));
    expect(s.total).toBeLessThan(20);
    expect(s.missingSkillIds).toEqual([7, 8]);
  });

  it('xếp hạng đúng thứ tự: khớp nhiều hơn -> điểm cao hơn', () => {
    const good = scoreJob(cand(), job());
    const mid = scoreJob(cand(), job({ skillIds: [1, 9], locationId: 99 }));
    const bad = scoreJob(cand(), job({ skillIds: [8, 9], categoryIds: [200], title: 'Nhân viên kinh doanh' }));
    expect(good.total).toBeGreaterThan(mid.total);
    expect(mid.total).toBeGreaterThan(bad.total);
  });

  it('làm từ xa không bị trừ điểm địa điểm', () => {
    expect(scoreJob(cand(), job({ jobType: 'REMOTE', locationId: 99 })).breakdown.location).toBe(10);
  });

  it('thiếu 1 năm kinh nghiệm: nửa điểm; thiếu nhiều: 0', () => {
    expect(scoreJob(cand(), job({ experienceYears: 3 })).breakdown.experience).toBe(5);
    expect(scoreJob(cand(), job({ experienceYears: 5 })).breakdown.experience).toBe(0);
  });

  it('hồ sơ trống vẫn chấm được (điểm trung tính, không lỗi)', () => {
    const s = scoreJob(
      { skillIds: new Set(), headlineTokens: new Set(), locationId: null, yearsOfExperience: 0, expectedSalary: null, categoryAffinity: new Map() },
      job(),
    );
    expect(s.total).toBeGreaterThan(0);
    expect(s.total).toBeLessThan(60);
  });

  it('tokenize bỏ dấu và từ quá chung', () => {
    expect([...tokenize('Nhân viên Kế toán Thuế')]).toEqual(['ke', 'toan', 'thue']);
  });
});
