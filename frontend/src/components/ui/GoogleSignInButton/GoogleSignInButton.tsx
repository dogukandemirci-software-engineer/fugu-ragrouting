import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useGoogleAuthMutation } from '../../../store/api/authApi';
import toast from 'react-hot-toast';

interface Props {
  label?: string;
}

export function GoogleSignInButton({ label = 'Continue with Google' }: Props) {
  const navigate = useNavigate();
  const [googleAuth] = useGoogleAuthMutation();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error('Google sign-in failed: no credential received');
      return;
    }
    try {
      await googleAuth({ id_token: credentialResponse.credential }).unwrap();
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.data?.error?.message ?? 'Google sign-in failed');
    }
  };

  return (
    <div className="w-full flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error('Google sign-in was cancelled or failed')}
        text={label === 'Continue with Google' ? 'continue_with' : 'signin_with'}
        shape="rectangular"
        size="large"
        width="360"
        theme="outline"
      />
    </div>
  );
}
