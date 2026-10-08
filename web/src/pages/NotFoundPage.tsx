import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <p className="mt-4 text-slate-600">Không tìm thấy trang bạn yêu cầu.</p>
      <Link to="/" className="mt-6 inline-block text-brand-600 hover:underline">
        ← Về trang chủ
      </Link>
    </div>
  );
}
