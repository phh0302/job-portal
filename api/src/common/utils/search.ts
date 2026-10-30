/** Escape ký tự đại diện của LIKE trong SQL Server: [ ] % _ */
export const likeEscape = (s: string) => s.replace(/[[\]%_]/g, (c) => `[${c}]`);

/** "đ/Đ" không được collation AI coi là "d" nên đổi tay ở cả hai phía */
const foldD = (s: string) => s.replace(/đ/g, 'd').replace(/Đ/g, 'D');

/** Tham số cho LIKE: %từ khoá% (đã escape, đã đổi đ→d) */
export const searchKeyword = (q: string) => `%${likeEscape(foldD(q.trim()))}%`;

/**
 * Điều kiện LIKE không phân biệt hoa/thường và dấu tiếng Việt (Q-02):
 * "ke toan" khớp "Kế toán", "phuong nam" khớp "Phương Nam", "dong" khớp "Đông".
 * Dùng cùng tham số tạo bởi searchKeyword().
 */
export const aiLike = (column: string, param = 'kw') =>
  `REPLACE(REPLACE(${column}, N'đ', N'd'), N'Đ', N'D') COLLATE Latin1_General_100_CI_AI LIKE :${param}`;
