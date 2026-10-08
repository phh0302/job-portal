import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/useAuth';
import Select from '../../../components/Select';
import { Alert, Button, Field } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { useLocations } from '../../../lib/catalog';
import { candidateInfoSchema } from '../../../lib/schemas';
import { PROFILE_KEY, type CandidateProfile } from '../types';

type InfoValues = z.infer<typeof candidateInfoSchema>;

export default function InfoCard({ profile }: { profile: CandidateProfile }) {
  const qc = useQueryClient();
  const { reloadUser } = useAuth();
  const { data: locations } = useLocations();
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<InfoValues>({
    resolver: zodResolver(candidateInfoSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: profile.fullName,
      headline: profile.headline ?? '',
      phone: profile.phone ?? '',
      dateOfBirth: profile.dateOfBirth ?? '',
      address: profile.address ?? '',
      locationId: profile.locationId ? String(profile.locationId) : '',
      yearsOfExperience: String(profile.yearsOfExperience),
      expectedSalary: profile.expectedSalary ? String(profile.expectedSalary / 1_000_000) : '',
      summary: profile.summary ?? '',
    },
  });

  const save = useMutation({
    mutationFn: async (v: InfoValues) =>
      (
        await api.patch<CandidateProfile>('/candidate/profile', {
          ...v,
          locationId: v.locationId ? Number(v.locationId) : null,
          yearsOfExperience: Number(v.yearsOfExperience || 0),
          expectedSalary: v.expectedSalary ? Math.round(Number(v.expectedSalary) * 1_000_000) : null,
        })
      ).data,
    onSuccess: (data) => {
      qc.setQueryData(PROFILE_KEY, data);
      reloadUser().catch(() => undefined); // cập nhật tên trên header
    },
    meta: { successMessage: 'Đã lưu hồ sơ' },
  });

  const avatar = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return (await api.post<{ avatarUrl: string }>('/candidate/profile/avatar', fd)).data;
    },
    onSuccess: ({ avatarUrl }) => qc.setQueryData<CandidateProfile>(PROFILE_KEY, (p) => (p ? { ...p, avatarUrl } : p)),
    meta: { successMessage: 'Đã cập nhật ảnh đại diện' },
  });

  const togglePublic = useMutation({
    mutationFn: async (isPublic: boolean) => (await api.patch<CandidateProfile>('/candidate/profile', { isPublic })).data,
    onSuccess: (data) => qc.setQueryData(PROFILE_KEY, data),
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100"
          title="Đổi ảnh đại diện"
        >
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-3xl font-bold text-slate-400">
              {profile.fullName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-xs text-white group-hover:flex">
            {avatar.isPending ? 'Đang tải…' : 'Đổi ảnh'}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) avatar.mutate(f);
            e.target.value = '';
          }}
        />
        <div className="flex-1">
          <p className="text-lg font-semibold">{profile.fullName}</p>
          <p className="text-sm text-slate-500">{profile.headline || 'Chưa có tiêu đề nghề nghiệp'}</p>
          {avatar.isError && <p className="mt-1 text-xs text-red-600">{errorMessage(avatar.error)}</p>}
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={profile.isPublic}
            disabled={togglePublic.isPending}
            onChange={(e) => togglePublic.mutate(e.target.checked)}
          />
          Cho phép nhà tuyển dụng tìm thấy hồ sơ
        </label>
      </div>

      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
        {save.isError && (
          <div className="sm:col-span-2">
            <Alert type="error">{errorMessage(save.error)}</Alert>
          </div>
        )}
        <Field label="Họ và tên *" {...register('fullName')} error={errors.fullName?.message} maxLength={150} />
        <Field label="Tiêu đề nghề nghiệp" {...register('headline')} error={errors.headline?.message} placeholder="VD: Lập trình viên Frontend" maxLength={200} />
        <Field label="Số điện thoại" {...register('phone')} error={errors.phone?.message} maxLength={20} />
        <Field label="Ngày sinh" type="date" {...register('dateOfBirth')} error={errors.dateOfBirth?.message} />
        <Field label="Địa chỉ" {...register('address')} error={errors.address?.message} maxLength={255} />
        <Select
          label="Tỉnh/thành"
          {...register('locationId')}
          placeholder="-- Chọn --"
          options={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))}
        />
        <Field label="Số năm kinh nghiệm" type="number" min={0} max={50} {...register('yearsOfExperience')} error={errors.yearsOfExperience?.message} />
        <Field label="Mức lương mong muốn (triệu/tháng)" type="number" min={0} step="0.5" {...register('expectedSalary')} error={errors.expectedSalary?.message} />
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-slate-700">Giới thiệu bản thân</span>
          <textarea
            {...register('summary')}
            rows={4}
            maxLength={5000}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" loading={save.isPending}>
            Lưu thông tin
          </Button>
        </div>
      </form>
    </section>
  );
}
