import { readFileSync } from 'fs';
import { join } from 'path';
import { ScreeningVerdict } from '../../common/enums';
import { rulesCandidateCheck } from './candidate-check.engine';
import { pdfToText } from './pdf-text';
import type { CandidateBrief, JobBrief } from './screening.engine';

const read = (f: string) => readFileSync(join(__dirname, '../../../test/fixtures/cv', f));
const empty: CandidateBrief = { headline: null, summary: null, yearsOfExperience: 0, skills: [], experiences: [], educations: [], coverLetter: null };

describe('Đọc chữ từ CV PDF (dùng khi chưa bật AI)', () => {
  it('PDF xuất từ Word/LibreOffice: tiếng Việt có dấu, đúng thứ tự dòng', () => {
    const t = pdfToText(read('cv-manh.pdf'));
    expect(t).toContain('NGUYỄN VĂN A');
    expect(t).toContain('Lập trình viên ReactJS, TypeScript');
    expect(t).toContain('Đại học Bách Khoa – Công nghệ thông tin');
    expect(t.indexOf('Kinh nghiệm')).toBeLessThan(t.indexOf('Học vấn'));
  });

  it('PDF in từ Chrome (font CID): ghép đúng từ, không tách từng ký tự', () => {
    const t = pdfToText(read('cv-chrome.pdf'));
    expect(t).toContain('Trần Thị Mẫu');
    expect(t).toContain('ReactJS, TypeScript, Docker, Tailwind CSS');
    expect(t).toContain('Xây dựng dashboard cho 5.000 người dùng');
  });

  it('File không phải PDF / PDF hỏng → chuỗi rỗng, không ném lỗi', () => {
    expect(pdfToText(Buffer.from('xin chào'))).toBe('');
    expect(pdfToText(Buffer.concat([read('cv-manh.pdf').subarray(0, 2000)]))).toBe('');
  });

  it('So khớp từ khoá dùng được nội dung PDF', () => {
    const job: JobBrief = {
      title: 'Lập trình viên ReactJS',
      level: 'JUNIOR',
      experienceYears: 2,
      skills: ['ReactJS', 'TypeScript', 'Docker', 'GraphQL'],
      categories: ['CNTT'],
      description: '',
      requirements: '',
    };
    const r = rulesCandidateCheck(job, { ...empty, yearsOfExperience: 3 }, pdfToText(read('cv-chrome.pdf')));
    expect(r.cvReadable).toBe(true);
    expect(r.missingKeywords).toEqual(['GraphQL']);
    expect(r.verdict).toBe(ScreeningVerdict.STRONG);
  });
});
