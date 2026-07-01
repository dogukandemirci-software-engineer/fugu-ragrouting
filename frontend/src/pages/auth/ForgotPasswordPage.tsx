import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useForgotPasswordMutation } from '../../store/api/authApi';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [forgot, { isLoading }] = useForgotPasswordMutation();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await forgot(data).unwrap().catch(() => {});
    navigate('/check-your-email');
  };

  return (
    <div>
      <h1 className="text-headline-lg font-headline font-bold text-on-surface mb-2">Reset your password</h1>
      <p className="text-body-md text-on-surface-variant mb-8">Enter your email and we'll send you a reset link.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input {...register('email')} label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} />
        <Button variant="brand" className="w-full justify-center" loading={isLoading} type="submit" size="lg">
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-on-surface-variant">
        Remember your password?{' '}
        <Link to="/log-in" className="text-accent-violet font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
