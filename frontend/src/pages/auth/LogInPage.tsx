import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GoogleSignInButton } from '../../components/ui/GoogleSignInButton/GoogleSignInButton';
import { useLogInMutation } from '../../store/api/authApi';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export function LogInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [logIn, { isLoading }] = useLogInMutation();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await logIn(data).unwrap();
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.data?.error?.message ?? 'Login failed. Check your credentials.');
    }
  };

  return (
    <div>
      <h1 className="text-headline-lg font-headline font-bold text-on-surface mb-2">Welcome back</h1>
      <p className="text-body-md text-on-surface-variant mb-8">Sign in to your FUGU account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          {...register('email')}
          label="Email"
          type="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          autoComplete="email"
        />
        <Input
          {...register('password')}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Your password"
          error={errors.password?.message}
          autoComplete="current-password"
          rightElement={
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-on-surface-variant hover:text-on-surface">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-body-sm text-accent-violet hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button variant="brand" className="w-full justify-center" loading={isLoading} type="submit" size="lg">
          Sign in
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <hr className="flex-1 border-outline-variant" />
        <span className="text-body-sm text-on-surface-variant">or</span>
        <hr className="flex-1 border-outline-variant" />
      </div>

      <div className="mt-4">
        <GoogleSignInButton label="Continue with Google" />
      </div>

      <p className="mt-6 text-center text-body-sm text-on-surface-variant">
        Don't have an account?{' '}
        <Link to="/sign-up" className="text-accent-violet font-medium hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
