/**
 * Khai báo kiểu tối thiểu cho pdfmake (bản 0.2.x, build cho trình duyệt).
 * Đủ dùng cho tạo CV; không cần cài thêm @types/pdfmake.
 */
declare module 'pdfmake/build/pdfmake' {
  export interface TCreatedPdf {
    download(fileName?: string): void;
    // 0.2.x: callback; 0.3.x: trả Promise
    getBlob(cb?: (blob: Blob) => void): Promise<Blob> | void;
  }
  export interface PdfMakeStatic {
    vfs: Record<string, string>;
    fonts?: Record<string, Record<string, string>>;
    createPdf(doc: object): TCreatedPdf;
    addVirtualFileSystem?(vfs: Record<string, string>): void;
  }
  const pdfMake: PdfMakeStatic;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const fonts: unknown;
  export default fonts;
}
