import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export function CheckYourEmailPage() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-accent-violet/10 flex items-center justify-center mx-auto mb-6">
        <Mail size={28} className="text-accent-violet" />
      </div>
      <h1 className="text-headline-lg font-headline font-bold text-on-surface mb-2">Check your email</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        We sent a password reset link to your email address. It expires in 1 hour.
      </p>
      <p className="text-body-sm text-on-surface-variant">
        Didn't receive it?{' '}
        <Link to="/forgot-password" className="text-accent-violet font-medium hover:underline">
          Resend
        </Link>
      </p>
      <p className="mt-4 text-body-sm text-on-surface-variant">
        <Link to="/log-in" className="text-accent-violet font-medium hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
