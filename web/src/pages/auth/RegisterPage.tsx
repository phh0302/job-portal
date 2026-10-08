import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { z } from 'zod';
import { useAuth } from '../../auth/useAuth';
import { ROLE_HOME } from '../../auth/types';
import { Alert, AuthCard, Button, Field } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { PASSWORD_MSG, registerSchema } from '../../lib/schemas';
import { useSeo } from '../../lib/seo';

type Values = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  useSeo({ title: 'Đăng ký tài khoản' });
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { role: params.get('role') === 'employer' ? 'EMPLOYER' : 'CANDIDATE', fullName: '', email: params.get('email') ?? '', password: '', confirm: '' },
  });
  const role = watch('role');
  const mut = useMutation({
    mutationFn: (v: Values) => signUp({ email: v.email, password: v.password, fullName: v.fullName, role: v.role }),
    // ?next= chỉ nhận đường dẫn nội bộ (chống chuyển hướng sang trang ngoài)
    onSuccess: (user) => {
      const next = params.get('next');
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : ROLE_HOME[user.role], { replace: true });
    },
  });

  return (
    <AuthCard
      title="Tạo tài khoản"
      subtitle={<>Đã có tài khoản? <Link to="/login" className="text-brand-600 hover:underline">Đăng nhập</Link></>}
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 text-sm" role="radiogroup" aria-label="Loại tài khoản">
        {(
          [
            ['CANDIDATE', 'Tôi là ứng viên'],
            ['EMPLOYER', 'Tôi là nhà tuyển dụng'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={role === value}
            onClick={() => setValue('role', value)}
            className={`rounded-md py-2 font-medium ${role === value ? 'bg-white text-brand-600 shadow' : 'text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="space-y-4" noValidate>
        {mut.isError && <Alert type="error">{errorMessage(mut.error)}</Alert>}
        <Field label="Họ và tên" autoComplete="name" {...register('fullName')} error={errors.fullName?.message} />
        <Field label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
        <Field label="Mật khẩu" type="password" autoComplete="new-password" placeholder={PASSWORD_MSG} {...register('password')} error={errors.password?.message} />
        <Field label="Nhập lại mật khẩu" type="password" autoComplete="new-password" {...register('confirm')} error={errors.confirm?.message} />
        <Button type="submit" loading={mut.isPending} className="w-full">
          Đăng ký {role === 'EMPLOYER' ? 'nhà tuyển dụng' : 'ứng viên'}
        </Button>
      </form>
    </AuthCard>
  );
}
