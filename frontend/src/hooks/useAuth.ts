import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store/authSlice';
import { useLogoutMutation } from '../store/api/authApi';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, organizationId, isAuthenticated, accessToken } = useSelector(
    (state: RootState) => state.auth
  );
  const [logoutMutation] = useLogoutMutation();

  const handleLogout = async () => {
    await logoutMutation().catch(() => {});
    dispatch(logout());
  };

  return { user, organizationId, isAuthenticated, accessToken, logout: handleLogout };
}
