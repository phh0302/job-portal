import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ChipPicker from '../../components/ChipPicker';
import RichTextEditor from '../../components/RichTextEditor';
import Select from '../../components/Select';
import { toast } from '../../components/Toast';
import { Alert, Button, Field } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useCategories, useLocations, useSkills } from '../../lib/catalog';
import { useSelectSync } from '../../lib/useSelectSync';
import { JOB_TYPE_LABEL, LEVEL_LABEL } from '../../lib/format';
import { JOB_STATUS, StatusBadge } from '../../lib/status';
import { makeJobSchema, type JobFormValues } from '../../lib/schemas';
import { usePublicSettings } from '../../lib/settings';
import type { EmployerJobDetail } from './types';

const toOptions = (rec: Record<string, string>) => Object.entries(rec).map(([value, label]) => ({ value, label }));
const toMillion = (n: number | null) => (n === null ? '' : String(n / 1_000_000));
const fromMillion = (s: string) => (s.trim() === '' ? null : Math.round(Number(s) * 1_000_000));
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000 + 7 * 3600_000).toISOString().slice(0, 10);

function JobForm({ job, defaultDays, maxDays }: { job?: EmployerJobDetail; defaultDays: number; maxDays: number }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { data: skills } = useSkills();
  const { data: locations } = useLocations();
  const schema = useMemo(() => makeJobSchema(maxDays), [maxDays]);
  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<JobFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      title: job?.title ?? '',
      jobType: job?.jobType ?? 'FULL_TIME',
      level: job?.level ?? 'JUNIOR',
      experienceYears: String(job?.experienceYears ?? 0),
      quantity: String(job?.quantity ?? 1),
      salaryMin: toMillion(job?.salaryMin ?? null),
      salaryMax: toMillion(job?.salaryMax ?? null),
      salaryNegotiable: job?.salaryNegotiable ?? false,
      deadline: job?.deadline ?? plusDays(defaultDays),
      locationId: job?.locationId ? String(job.locationId) : '',
      workAddress: job?.workAddress ?? '',
      description: job?.description ?? '',
      requirements: job?.requirements ?? '',
      benefits: job?.benefits ?? '',
      categoryIds: job?.categoryIds ?? [],
      skillIds: job?.skillIds ?? [],
    },
  });
  useSelectSync(getValues, setValue, 'locationId', !!locations);
  const negotiable = watch('salaryNegotiable');

  const save = useMutation({
    mutationFn: async ({ v, submit }: { v: JobFormValues; submit: boolean }) => {
      const body = {
        ...v,
        experienceYears: Number(v.experienceYears || 0),
        quantity: Number(v.quantity || 1),
        salaryMin: v.salaryNegotiable ? null : fromMillion(v.salaryMin),
        salaryMax: v.salaryNegotiable ? null : fromMillion(v.salaryMax),
        locationId: v.locationId ? Number(v.locationId) : null,
        submit,
      } as Record<string, unknown>;
      // Khi sửa: chỉ gửi nội dung thực sự thay đổi (tránh tin đang hiển thị bị đưa về chờ duyệt oan)
      if (job) {
        for (const f of ['title', 'description', 'requirements', 'benefits', 'categoryIds', 'skillIds'] as const) {
          if (!dirtyFields[f]) delete body[f];
        }
      }
      return (job ? await api.patch<EmployerJobDetail>(`/employer/jobs/${job.id}`, body) : await api.post<EmployerJobDetail>('/employer/jobs', body)).data;
    },
    onSuccess: (j) => {
      qc.invalidateQueries({ queryKey: ['employer', 'jobs'] });
      toast(j.status === 'PENDING' ? 'Đã gửi tin, đang chờ duyệt' : j.status === 'DRAFT' ? 'Đã lưu nháp' : 'Đã lưu tin');
      navigate('/employer/jobs');
    },
  });

  const submitWith = (submit: boolean) => handleSubmit((v) => save.mutate({ v, submit }));
  const willReview = job?.status === 'APPROVED';
  const errCount = Object.keys(errors).length;

  return (
    <form onSubmit={submitWith(true)} className="space-y-4" noValidate>
      {job?.status === 'REJECTED' && job.rejectReason && <Alert type="error">Tin bị từ chối. Lý do: {job.rejectReason}</Alert>}
      {willReview && <Alert type="info">Tin đang hiển thị. Nếu sửa tiêu đề, mô tả, yêu cầu, quyền lợi, ngành hoặc kỹ năng, tin sẽ phải chờ duyệt lại.</Alert>}
      {save.isError && <Alert type="error">{errorMessage(save.error)}</Alert>}

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">Thông tin chung</h2>
        <div className="sm:col-span-2">
          <Field label="Chức danh *" {...register('title')} error={errors.title?.message} maxLength={200} placeholder="VD: Lập trình viên ReactJS" />
        </div>
        <Select label="Loại hình *" {...register('jobType')} options={toOptions(JOB_TYPE_LABEL)} />
        <Select label="Cấp bậc *" {...register('level')} options={toOptions(LEVEL_LABEL)} />
        <Field label="Kinh nghiệm tối thiểu (năm)" type="number" min={0} max={30} {...register('experienceYears')} error={errors.experienceYears?.message} />
        <Field label="Số lượng tuyển" type="number" min={1} max={1000} {...register('quantity')} error={errors.quantity?.message} />
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3">
          <Field label="Lương từ (triệu)" type="number" min={0} step="0.5" {...register('salaryMin')} error={negotiable ? undefined : errors.salaryMin?.message} disabled={negotiable} />
          <Field label="Đến (triệu)" type="number" min={0} step="0.5" {...register('salaryMax')} error={negotiable ? undefined : errors.salaryMax?.message} disabled={negotiable} />
          <label className="col-span-2 flex items-center gap-2 self-end pb-2 text-sm sm:col-span-1">
            <input type="checkbox" {...register('salaryNegotiable')} />
            Lương thỏa thuận
          </label>
        </div>
        <Select label="Tỉnh/thành" {...register('locationId')} placeholder="-- Chọn --" options={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))} />
        <Field label="Hạn nộp hồ sơ *" type="date" {...register('deadline')} error={errors.deadline?.message} />
        <div className="sm:col-span-2">
          <Field label="Địa chỉ làm việc" {...register('workAddress')} error={errors.workAddress?.message} maxLength={255} />
        </div>
        <div className="sm:col-span-2">
          <Controller
            control={control}
            name="categoryIds"
            render={({ field, fieldState }) => (
              <>
                <ChipPicker label="Ngành nghề *" options={categories ?? []} value={field.value} onChange={field.onChange} max={3} />
                {fieldState.error && <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>}
              </>
            )}
          />
        </div>
        <div className="sm:col-span-2">
          <Controller
            control={control}
            name="skillIds"
            render={({ field }) => <ChipPicker label="Kỹ năng" options={skills ?? []} value={field.value} onChange={field.onChange} max={15} />}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Nội dung</h2>
        {(
          [
            ['description', 'Mô tả công việc *', 'Công việc hằng ngày, phạm vi trách nhiệm…'],
            ['requirements', 'Yêu cầu ứng viên', 'Kỹ năng, kinh nghiệm, bằng cấp…'],
            ['benefits', 'Quyền lợi', 'Lương thưởng, bảo hiểm, đào tạo…'],
          ] as const
        ).map(([name, label, hint]) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field, fieldState }) => (
              <div className="text-sm">
                <label htmlFor={`job-${name}`} className="mb-1 block font-medium text-slate-700">{label}</label>
                <RichTextEditor
                  id={`job-${name}`}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!fieldState.error}
                  placeholder={hint}
                  minHeight={name === 'description' ? 200 : 140}
                />
                {fieldState.error && <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>}
              </div>
            )}
          />
        ))}
      </section>

      {errCount > 0 && <Alert type="error">Còn {errCount} mục chưa hợp lệ, vui lòng kiểm tra lại các ô được đánh dấu đỏ.</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={save.isPending && save.variables?.submit === true}>
          {willReview ? 'Lưu' : 'Gửi duyệt'}
        </Button>
        {(!job || job.status === 'DRAFT' || job.status === 'REJECTED') && (
          <Button type="button" variant="outline" loading={save.isPending && save.variables?.submit === false} onClick={submitWith(false)}>
            Lưu nháp
          </Button>
        )}
        <Link to="/employer/jobs" className="px-4 py-2 text-slate-600 hover:underline">Hủy</Link>
      </div>
    </form>
  );
}

export default function JobFormPage() {
  const { id } = useParams();
  const { data: settings, isLoading: settingsLoading } = usePublicSettings();
  const { data: job, isLoading, error } = useQuery({
    queryKey: ['employer', 'job', id],
    queryFn: async () => (await api.get<EmployerJobDetail>(`/employer/jobs/${id}`)).data,
    enabled: !!id,
  });

  if (settingsLoading || (id && isLoading)) return <p className="text-slate-500">Đang tải…</p>;
  if (id && (error || !job)) return <Alert type="error">{errorMessage(error, 'Không tìm thấy tin')}</Alert>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{job ? 'Sửa tin tuyển dụng' : 'Đăng tin tuyển dụng'}</h1>
        {job && <StatusBadge map={JOB_STATUS} value={job.status} />}
      </div>
      {job?.status === 'PENDING' ? (
        <Alert type="info">Tin đang chờ duyệt, bạn có thể sửa sau khi có kết quả.</Alert>
      ) : (
        <JobForm key={job?.id ?? 'new'} job={job} defaultDays={settings?.jobDefaultDays ?? 30} maxDays={settings?.jobMaxDays ?? 90} />
      )}
    </div>
  );
}
