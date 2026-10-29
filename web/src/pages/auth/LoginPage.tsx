import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import { useAuth } from '../../auth/useAuth';
import { homeAfterLogin } from '../../auth/types';
import { Alert, AuthCard, Button, Field } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { loginSchema } from '../../lib/schemas';
import { useSeo } from '../../lib/seo';

type Values = z.infer<typeof loginSchema>;

export default function LoginPage() {
  useSeo({ title: 'Đăng nhập' });
  const { login, sessionNotice } = useAuth();
  const navigate = useNavigate();
  const state = useLocation().state as { from?: string; notice?: string } | null;
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const mut = useMutation({
    mutationFn: (v: Values) => login(v.email, v.password),
    onSuccess: (user) => navigate(homeAfterLogin(user.role, state?.from), { replace: true }),
  });

  return (
    <AuthCard
      title="Đăng nhập"
      subtitle={<>Chưa có tài khoản? <Link to="/register" className="text-brand-600 hover:underline">Đăng ký</Link></>}
    >
      <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="space-y-4" noValidate>
        {sessionNotice && !mut.isError && <Alert type="error">{sessionNotice}</Alert>}
        {state?.notice && !mut.isError && !sessionNotice && <Alert type="success">{state.notice}</Alert>}
        {mut.isError && <Alert type="error">{errorMessage(mut.error)}</Alert>}
        <Field label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
        <Field label="Mật khẩu" type="password" autoComplete="current-password" {...register('password')} error={errors.password?.message} />
        <div className="text-right text-sm">
          <Link to="/forgot-password" className="text-brand-600 hover:underline">Quên mật khẩu?</Link>
        </div>
        <Button type="submit" loading={mut.isPending} className="w-full">Đăng nhập</Button>
      </form>
    </AuthCard>
  );
}
