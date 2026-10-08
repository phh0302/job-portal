import { useState } from 'react';

export interface ColumnDatum {
  key: string;
  label: string; // nhãn trục X
  tooltip: string; // tiêu đề tooltip
  value: number;
}

const W = 720;
const H = 220;
const M = { top: 12, right: 8, bottom: 26, left: 36 };
const BAR_COLOR = '#2563eb'; // brand-600, đã kiểm tra tương phản trên nền sáng

/** Trục Y: bước "đẹp" (1, 2, 5 × 10^n), tối đa ~5 khoảng, mọi vạch là số tròn */
function yScale(v: number) {
  const raw = Math.max(1, v / 5);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((s) => s * pow).find((s) => s >= raw)!;
  const max = Math.max(step * Math.ceil(v / step), 4 * Math.min(step, 1));
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  return { max, ticks };
}

/** Biểu đồ cột 1 chuỗi: cột mảnh, bo 4px đầu cột, lưới mảnh, tooltip khi rê chuột, kèm bảng số liệu */
export default function ColumnChart({ data, unit, labelEvery = 5 }: { data: ColumnDatum[]; unit: string; labelEvery?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const { max, ticks } = yScale(Math.max(0, ...data.map((d) => d.value)));
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const band = innerW / data.length;
  const barW = Math.min(24, band - 2); // khe 2px giữa các cột
  const y = (v: number) => M.top + innerH - (v / max) * innerH;
  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Biểu đồ cột, ${data.length} điểm dữ liệu`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={M.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[11px]">
                {t.toLocaleString('vi-VN')}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = M.left + i * band + (band - barW) / 2;
            const top = y(d.value);
            const hgt = M.top + innerH - top;
            const r = Math.min(4, hgt);
            return (
              <g key={d.key}>
                {d.value > 0 && (
                  <path
                    d={`M${x},${top + hgt} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + hgt} Z`}
                    fill={BAR_COLOR}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[11px]">
                    {d.label}
                  </text>
                )}
                {/* vùng rê chuột rộng hơn cột */}
                <rect
                  x={M.left + i * band}
                  y={M.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow"
            style={{ left: `${((M.left + hover * band + band / 2) / W) * 100}%`, top: `${(y(h.value) / H) * 100}%` }}
          >
            <p className="text-slate-500">{h.tooltip}</p>
            <p className="font-semibold text-slate-900">
              {h.value.toLocaleString('vi-VN')} {unit}
            </p>
          </div>
        )}
      </div>
      <button onClick={() => setShowTable((s) => !s)} className="mt-1 text-xs text-slate-500 hover:text-brand-600">
        {showTable ? 'Ẩn bảng số liệu' : 'Xem dạng bảng'}
      </button>
      {showTable && (
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.map((d) => (
                <tr key={d.key}>
                  <td className="py-1 text-slate-600">{d.tooltip}</td>
                  <td className="py-1 text-right tabular-nums">{d.value.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
