import sanitizeHtml from 'sanitize-html';

/**
 * Làm sạch HTML từ trình soạn thảo (chống XSS): chỉ giữ thẻ định dạng cơ bản,
 * link được ép rel="nofollow noopener" và chỉ cho http/https/mailto.
 */
export function sanitizeRichText(input: string | null | undefined): string | null {
  if (input == null) return null;
  const clean = sanitizeHtml(input, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer', target: '_blank' }),
      h1: 'h2',
      b: 'strong',
      i: 'em',
    },
    // Văn bản thuần (không có thẻ) giữ nguyên xuống dòng
    textFilter: (text) => text,
  }).trim();
  return clean;
}

/** Bỏ thẻ HTML lấy văn bản thuần (để kiểm tra rỗng, làm mô tả SEO…) */
export function htmlToPlainText(input: string | null | undefined): string {
  if (!input) return '';
  return sanitizeHtml(input.replace(/<\/(p|li|h2|h3|blockquote)>|<br\s*\/?>/gi, '\n'), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
