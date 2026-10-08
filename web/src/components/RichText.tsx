const looksLikeHtml = (s: string) => /<\/?(p|br|ul|ol|li|strong|em|h2|h3|blockquote|a|u|s)\b/i.test(s);

/** Văn bản thuần -> HTML đoạn văn (dùng khi mở tin cũ trong trình soạn thảo) */
export function plainToHtml(s: string | null | undefined): string {
  if (!s) return '';
  if (looksLikeHtml(s)) return s;
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  return s
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${esc(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
      }
      return `<p>${lines.map(esc).join('<br>')}</p>`;
    })
    .join('');
}

/** Bỏ thẻ HTML, lấy văn bản thuần (mô tả SEO…) */
export function stripHtml(s: string | null | undefined): string {
  if (!s) return '';
  const div = document.createElement('div');
  div.innerHTML = s.replace(/<\/(p|li|h2|h3)>|<br\s*\/?>/gi, ' ');
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Hiển thị nội dung tin tuyển dụng. HTML đã được API làm sạch (sanitize-html) trước khi lưu;
 * tin cũ dạng văn bản thuần hiển thị giữ nguyên xuống dòng.
 */
export default function RichText({ value, className = '' }: { value: string | null | undefined; className?: string }) {
  if (!value) return null;
  if (!looksLikeHtml(value)) return <div className={`whitespace-pre-line ${className}`}>{value}</div>;
  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: value }} />;
}
