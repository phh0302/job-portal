import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import { useAuth } from '../../auth/useAuth';
import { Alert, AuthCard, Button, Field } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { PASSWORD_MSG, changePasswordSchema } from '../../lib/schemas';

type Values = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { current: '', password: '', confirm: '' },
  });
  const mut = useMutation({
    mutationFn: async (v: Values) => {
      await api.post('/auth/change-password', { currentPassword: v.current, newPassword: v.password });
      await logout();
    },
    onSuccess: () => navigate('/login', { replace: true, state: { notice: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại' } }),
  });

  return (
    <AuthCard title="Đổi mật khẩu" subtitle="Sau khi đổi, bạn sẽ được đăng xuất khỏi mọi thiết bị.">
      <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="space-y-4" noValidate>
        {mut.isError && <Alert type="error">{errorMessage(mut.error)}</Alert>}
        <Field label="Mật khẩu hiện tại" type="password" autoComplete="current-password" {...register('current')} error={errors.current?.message} />
        <Field label="Mật khẩu mới" type="password" placeholder={PASSWORD_MSG} autoComplete="new-password" {...register('password')} error={errors.password?.message} />
        <Field label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" {...register('confirm')} error={errors.confirm?.message} />
        <Button type="submit" loading={mut.isPending} className="w-full">Đổi mật khẩu</Button>
      </form>
    </AuthCard>
  );
}
