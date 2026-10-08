import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import type { z } from 'zod';
import { Alert, AuthCard, Button, Field } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { PASSWORD_MSG, newPasswordSchema } from '../../lib/schemas';

type Values = z.infer<typeof newPasswordSchema>;

export default function ResetPasswordPage() {
  const token = useSearchParams()[0].get('token') ?? '';
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(newPasswordSchema), mode: 'onTouched', defaultValues: { password: '', confirm: '' } });
  const mut = useMutation({
    mutationFn: async (v: Values) => (await api.post<{ message: string }>('/auth/reset-password', { token, newPassword: v.password })).data,
  });

  if (!token) {
    return (
      <AuthCard title="Đặt lại mật khẩu">
        <Alert type="error">Link không hợp lệ. Vui lòng mở đúng link trong email.</Alert>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Đặt lại mật khẩu">
      {mut.isSuccess ? (
        <div className="space-y-4">
          <Alert type="success">{mut.data.message}</Alert>
          <Link to="/login" className="block text-center text-brand-600 hover:underline">Đăng nhập</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="space-y-4" noValidate>
          {mut.isError && <Alert type="error">{errorMessage(mut.error)}</Alert>}
          <Field label="Mật khẩu mới" type="password" placeholder={PASSWORD_MSG} autoComplete="new-password" {...register('password')} error={errors.password?.message} />
          <Field label="Nhập lại mật khẩu" type="password" autoComplete="new-password" {...register('confirm')} error={errors.confirm?.message} />
          <Button type="submit" loading={mut.isPending} className="w-full">Lưu mật khẩu mới</Button>
        </form>
      )}
    </AuthCard>
  );
}
