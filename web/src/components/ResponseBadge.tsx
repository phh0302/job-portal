import { responseTimeText } from '../lib/format';
import type { ResponseInfo } from '../lib/types';

/** Khối "Nhà tuyển dụng phản hồi thế nào" – minh bạch cho ứng viên */
export default function ResponseBadge({ info, compact = false }: { info: ResponseInfo | null | undefined; compact?: boolean }) {
  if (!info) {
    return compact ? null : (
      <p className="text-xs text-slate-500">Chưa đủ dữ liệu về tốc độ phản hồi của nhà tuyển dụng này.</p>
    );
  }
  return (
    <div className={`rounded-lg p-3 text-sm ${info.fast ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-700'}`}>
      <p className="font-medium">{info.fast ? '⚡ Nhà tuyển dụng phản hồi nhanh' : 'Tốc độ phản hồi'}</p>
      <p className="mt-0.5">
        Phản hồi <b>{info.rate}%</b> hồ sơ
        {info.avgHours !== null && (
          <>
            , thường <b>{responseTimeText(info.avgHours)}</b>
          </>
        )}
        .
      </p>
      {!compact && <p className="mt-1 text-xs opacity-75">Tính trên hồ sơ nộp trong 90 ngày gần nhất.</p>}
    </div>
  );
}
