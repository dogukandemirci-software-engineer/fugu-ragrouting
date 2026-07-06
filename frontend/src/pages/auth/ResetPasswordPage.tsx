import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useResetPasswordMutation } from '../../store/api/authApi';
import toast from 'react-hot-toast';

const schema = z
  .object({
    new_password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [reset, { isLoading }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Link is malformed or was opened without the token query param — nothing to
  // reset against, so send the user back to request a fresh link.
  if (!token) {
    return (
      <div>
        <h1 className="text-headline-lg font-headline font-bold text-on-surface mb-2">Invalid reset link</h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          This password reset link is missing or malformed. Request a new one to continue.
        </p>
        <Link to="/forgot-password">
          <Button variant="brand" className="w-full justify-center" size="lg">
            Request a new link
          </Button>
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    try {
      await reset({ token, new_password: data.new_password }).unwrap();
      toast.success('Password updated — sign in with your new password');
      navigate('/log-in');
    } catch (err: any) {
      toast.error(err?.data?.error?.message ?? 'Reset link is invalid or expired. Request a new one.');
    }
  };

  return (
    <div>
      <h1 className="text-headline-lg font-headline font-bold text-on-surface mb-2">Set a new password</h1>
      <p className="text-body-md text-on-surface-variant mb-8">Choose a strong password you don't use elsewhere.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          {...register('new_password')}
          label="New password"
          type="password"
          placeholder="••••••••"
          error={errors.new_password?.message}
        />
        <Input
          {...register('confirm')}
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          error={errors.confirm?.message}
        />
        <Button variant="brand" className="w-full justify-center" loading={isLoading} type="submit" size="lg">
          Update password
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-on-surface-variant">
        Remember your password?{' '}
        <Link to="/log-in" className="text-accent-violet font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
