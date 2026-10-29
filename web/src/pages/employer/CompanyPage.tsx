import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import CompanyLogo from '../../components/CompanyLogo';
import Select from '../../components/Select';
import { Alert, Button, Field } from '../../components/ui';
import { EMPLOYER_ME_KEY } from '../../layouts/EmployerLayout';
import { api, errorMessage } from '../../lib/api';
import { useLocations } from '../../lib/catalog';
import { useSelectSync } from '../../lib/useSelectSync';
import { COMPANY_SIZE_LABEL } from '../../lib/format';
import { companySchema } from '../../lib/schemas';
import { StatusBadge, VERIFY_STATUS } from '../../lib/status';
import type { EmployerCompany, EmployerMe } from './types';

function upload(url: string, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return api.post<EmployerCompany>(url, fd).then((r) => r.data);
}

type CompanyValues = z.infer<typeof companySchema>;

function CompanyForm({ company, readOnly = false }: { company: EmployerCompany | null; readOnly?: boolean }) {
  const qc = useQueryClient();
  const { data: locations } = useLocations();
  const locked = company?.verificationStatus === 'VERIFIED' || company?.verificationStatus === 'PENDING';
  const { register, handleSubmit, getValues, setValue, formState: { errors } } = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    mode: 'onTouched',
    defaultValues: {
      name: company?.name ?? '',
      taxCode: company?.taxCode ?? '',
      size: company?.size ?? '',
      website: company?.website ?? '',
      address: company?.address ?? '',
      locationId: company?.locationId ? String(company.locationId) : '',
      description: company?.description ?? '',
    },
  });
  useSelectSync(getValues, setValue, 'locationId', !!locations);

  const save = useMutation({
    mutationFn: async (v: CompanyValues) => {
      const body: Partial<Record<keyof CompanyValues, unknown>> = { ...v, locationId: v.locationId ? Number(v.locationId) : null };
      if (locked) {
        delete body.name;
        delete body.taxCode;
      }
      return (company ? await api.patch<EmployerCompany>('/employer/company', body) : await api.post<EmployerCompany>('/employer/company', body)).data;
    },
    onSuccess: (c) => qc.setQueryData<EmployerMe>(EMPLOYER_ME_KEY, (me) => (me ? { ...me, company: c } : me)),
    meta: { successMessage: 'Đã lưu thông tin công ty' },
  });

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <h2 className="text-lg font-semibold sm:col-span-2">Thông tin công ty</h2>
      {save.isError && <div className="sm:col-span-2"><Alert type="error">{errorMessage(save.error)}</Alert></div>}
      <fieldset disabled={readOnly} className="contents">
      <Field label="Tên công ty *" {...register('name')} error={errors.name?.message} maxLength={200} disabled={locked} />
      <Field label="Mã số thuế" {...register('taxCode')} error={errors.taxCode?.message} placeholder="10 số" maxLength={14} disabled={locked} />
      <Select label="Quy mô" {...register('size')} placeholder="-- Chọn --" options={Object.entries(COMPANY_SIZE_LABEL).map(([value, label]) => ({ value, label }))} />
      <Field label="Website" {...register('website')} error={errors.website?.message} placeholder="https://…" maxLength={255} />
      <Field label="Địa chỉ" {...register('address')} error={errors.address?.message} maxLength={255} />
      <Select label="Tỉnh/thành" {...register('locationId')} placeholder="-- Chọn --" options={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))} />
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block font-medium text-slate-700">Giới thiệu công ty</span>
        <textarea {...register('description')} rows={6} maxLength={10000} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
        {errors.description && <span className="mt-1 block text-xs text-red-600">{errors.description.message}</span>}
      </label>
      </fieldset>
      {locked && !readOnly && <p className="text-xs text-slate-500 sm:col-span-2">Tên và mã số thuế bị khóa vì công ty đã gửi xác minh.</p>}
      {!readOnly && (
        <div className="sm:col-span-2">
          <Button type="submit" loading={save.isPending}>{company ? 'Lưu thay đổi' : 'Tạo hồ sơ công ty'}</Button>
        </div>
      )}
    </form>
  );
}

function ImagesCard({ company }: { company: EmployerCompany }) {
  const qc = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const mut = useMutation({
    mutationFn: ({ kind, file }: { kind: 'logo' | 'cover'; file: File }) => upload(`/employer/company/${kind}`, file),
    onSuccess: (c) => qc.setQueryData<EmployerMe>(EMPLOYER_ME_KEY, (me) => (me ? { ...me, company: c } : me)),
  });
  const pick = (kind: 'logo' | 'cover') => (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) mut.mutate({ kind, file: f });
    e.target.value = '';
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Logo & ảnh bìa</h2>
      {mut.isError && <div className="mt-2"><Alert type="error">{errorMessage(mut.error)}</Alert></div>}
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="text-center">
          <CompanyLogo name={company.name} url={company.logoUrl} size={96} />
          <button onClick={() => logoRef.current?.click()} className="mt-2 text-sm text-brand-600 hover:underline">Đổi logo</button>
          <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick('logo')} />
        </div>
        <div className="flex-1">
          <div
            className="h-28 rounded-lg bg-gradient-to-r from-brand-600 to-blue-400"
            style={company.coverUrl ? { backgroundImage: `url(${company.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          />
          <button onClick={() => coverRef.current?.click()} className="mt-2 text-sm text-brand-600 hover:underline">Đổi ảnh bìa (≤ 3MB)</button>
          <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick('cover')} />
        </div>
      </div>
      {mut.isPending && <p className="mt-2 text-sm text-slate-500">Đang tải ảnh…</p>}
    </section>
  );
}

function VerificationCard({ company }: { company: EmployerCompany }) {
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const mut = useMutation({
    mutationFn: (file: File) => upload('/employer/company/verification', file),
    onSuccess: (c) => qc.setQueryData<EmployerMe>(EMPLOYER_ME_KEY, (me) => (me ? { ...me, company: c } : me)),
  });
  const canRequest = company.verificationStatus === 'UNVERIFIED' || company.verificationStatus === 'REJECTED';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Xác minh doanh nghiệp</h2>
        <StatusBadge map={VERIFY_STATUS} value={company.verificationStatus} />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Công ty đã xác minh sẽ có dấu ✔ trên tin tuyển dụng, giúp ứng viên tin tưởng hơn. Gửi giấy phép đăng ký kinh doanh (PDF/JPG/PNG, ≤ 5MB).
      </p>
      {company.verificationStatus === 'REJECTED' && company.verificationNote && (
        <div className="mt-3"><Alert type="error">Lý do từ chối: {company.verificationNote}</Alert></div>
      )}
      {company.verificationStatus === 'PENDING' && <div className="mt-3"><Alert type="info">Hồ sơ đang được quản trị viên xem xét.</Alert></div>}
      {mut.isError && <div className="mt-3"><Alert type="error">{errorMessage(mut.error)}</Alert></div>}
      {canRequest && (
        <div className="mt-3">
          <Button onClick={() => ref.current?.click()} loading={mut.isPending}>Gửi giấy phép kinh doanh</Button>
          <input
            ref={ref}
            type="file"
            accept=".pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) mut.mutate(f);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </section>
  );
}

export default function CompanyPage() {
  const { data: me } = useQuery({ queryKey: EMPLOYER_ME_KEY, queryFn: async () => (await api.get<EmployerMe>('/employer/me')).data });
  if (!me) return <p className="text-slate-500">Đang tải…</p>;
  const c = me.company;
  const isMember = !!c && me.profile.companyRole === 'MEMBER';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{c ? 'Hồ sơ công ty' : 'Tạo hồ sơ công ty'}</h1>
        {c && <Link to={`/companies/${c.slug}`} className="text-sm text-brand-600 hover:underline">Xem trang công khai →</Link>}
      </div>
      {isMember && (
        <Alert type="info">
          Bạn là thành viên của công ty này. Chỉ quản trị viên công ty mới sửa được hồ sơ, logo/ảnh bìa và gửi xác minh.
        </Alert>
      )}
      <CompanyForm key={c?.id ?? 'new'} company={c} readOnly={isMember} />
      {c && !isMember && <ImagesCard company={c} />}
      {c && !isMember && <VerificationCard company={c} />}
    </div>
  );
}
