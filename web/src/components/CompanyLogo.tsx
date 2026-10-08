export default function CompanyLogo({ name, url, size = 48 }: { name: string; url: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (url) return <img src={url} alt={name} style={style} className="shrink-0 rounded-lg border border-slate-200 bg-white object-contain" />;
  const letters = name
    .replace(/^(công ty|cty)\s+(tnhh|cp|cổ phần)?\s*/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div style={style} className="flex shrink-0 items-center justify-center rounded-lg bg-brand-50 font-bold text-brand-600">
      {letters}
    </div>
  );
}
