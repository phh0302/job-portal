import { useEffect } from 'react';

const SITE = 'JobPortal';
const DEFAULT_DESC = 'JobPortal – tìm việc làm, tuyển dụng nhanh chóng từ các nhà tuyển dụng uy tín trên toàn quốc.';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Đặt title, meta description, Open Graph, canonical và JSON-LD cho trang.
 * Lưu ý: đây là SPA nên Google vẫn đọc được (Googlebot chạy JS), nhưng mạng xã hội
 * (Facebook/Zalo) chỉ thấy thẻ mặc định trong index.html — cần SSR/prerender khi deploy nếu muốn preview đẹp.
 */
export function useSeo({
  title,
  description,
  image,
  jsonLd,
  noindex,
}: {
  title?: string;
  description?: string;
  image?: string | null;
  jsonLd?: object | null;
  noindex?: boolean;
}) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE}` : `${SITE} – Tìm việc làm`;
    const desc = (description ?? DEFAULT_DESC).replace(/\s+/g, ' ').trim().slice(0, 160);
    const url = window.location.origin + window.location.pathname;
    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', 'website');
    if (image) setMeta('property', 'og:image', new URL(image, window.location.origin).href);
    setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    let script: HTMLScriptElement | null = null;
    if (ld) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = ld;
      document.head.appendChild(script);
    }
    return () => {
      script?.remove();
    };
  }, [title, description, image, ld, noindex]);
}
