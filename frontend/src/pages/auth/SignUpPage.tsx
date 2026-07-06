import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GoogleSignInButton } from '../../components/ui/GoogleSignInButton/GoogleSignInButton';
import { useSignUpMutation } from '../../store/api/authApi';
import toast from 'react-hot-toast';

const schema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  organization_name: z.string().min(1, 'Organization name is required').max(80),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

type FormData = z.infer<typeof schema>;

export function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') ?? undefined;
  const [signUp, { isLoading }] = useSignUpMutation();

  const { register, handleSubmit, formState: { errors }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await signUp({ ...data, referral_code: referralCode }).unwrap();
      navigate('/dashboard');
      toast.success('Account created! Check your email to verify.');
    } catch (err: any) {
      const msg = err?.data?.error?.message ?? '';
      if (msg.toLowerCase().includes('email')) {
        setError('email', { message: 'An account with this email already exists. Log in instead.' });
      } else {
        toast.error(msg || 'Sign up failed. Please try again.');
      }
    }
  };

  return (
    <div>
      <h1 className="text-headline-lg font-headline font-bold text-on-surface mb-2">Create your account</h1>
      <p className="text-body-md text-on-surface-variant mb-2">Start routing queries with AI precision</p>
      {referralCode && (
        <p className="text-body-sm text-accent-violet mb-6">
          You were invited by a FUGU user — you'll both get bonus queries once you sign up.
        </p>
      )}
      {!referralCode && <div className="mb-8" />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input {...register('full_name')} label="Full name" placeholder="Jane Smith" error={errors.full_name?.message} />
        <Input {...register('organization_name')} label="Organization name" placeholder="Acme Corp" error={errors.organization_name?.message} />
        <Input {...register('email')} label="Work email" type="email" placeholder="you@company.com" error={errors.email?.message} autoComplete="email" />
        <Input
          {...register('password')}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="8+ characters"
          error={errors.password?.message}
          autoComplete="new-password"
          rightElement={
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-on-surface-variant hover:text-on-surface">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        <Button variant="brand" className="w-full justify-center mt-2" loading={isLoading} type="submit" size="lg">
          Create account
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <hr className="flex-1 border-outline-variant" />
        <span className="text-body-sm text-on-surface-variant">or</span>
        <hr className="flex-1 border-outline-variant" />
      </div>

      <div className="mt-4">
        <GoogleSignInButton label="Sign up with Google" />
      </div>

      <p className="mt-6 text-center text-body-sm text-on-surface-variant">
        Already have an account?{' '}
        <Link to="/log-in" className="text-accent-violet font-medium hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-[11px] text-on-surface-variant/60">
        By creating an account, you agree to our{' '}
        <Link to="/terms" className="underline hover:no-underline">Terms of Service</Link>
        {' '}and{' '}
        <Link to="/privacy" className="underline hover:no-underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
