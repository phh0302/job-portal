import { htmlToPlainText, sanitizeRichText } from './rich-text';

describe('sanitizeRichText', () => {
  it('giữ định dạng cơ bản', () => {
    expect(sanitizeRichText('<p><strong>Lương</strong> <em>cao</em></p><ul><li>A</li></ul>')).toBe(
      '<p><strong>Lương</strong> <em>cao</em></p><ul><li>A</li></ul>',
    );
  });
  it('xóa script, sự kiện, javascript: và style', () => {
    const out = sanitizeRichText(
      '<p onclick="x()">Hi<script>alert(1)</script></p><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a><p style="color:red">y</p>',
    )!;
    expect(out).not.toMatch(/script|onclick|onerror|javascript|style|<img/i);
  });
  it('ép rel/target cho link', () => {
    expect(sanitizeRichText('<a href="https://a.vn">a</a>')).toBe('<a href="https://a.vn" rel="nofollow noopener noreferrer" target="_blank">a</a>');
  });
  it('văn bản thuần giữ nguyên', () => {
    expect(sanitizeRichText('- Dòng 1\n- Dòng 2')).toBe('- Dòng 1\n- Dòng 2');
  });
  it('htmlToPlainText phát hiện nội dung rỗng', () => {
    expect(htmlToPlainText('<p></p><p> </p>')).toBe('');
    expect(htmlToPlainText('<p>A</p><p>B</p>')).toBe('A\nB');
  });
});
