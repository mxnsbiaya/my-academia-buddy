import { useContext } from 'react';
import { AuthContext } from './AuthContextDefinition';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      signUp: async () => ({ error: { message: 'Auth not initialized' } }),
      signIn: async () => ({ error: { message: 'Auth not initialized' } }),
      signOut: async () => ({ error: null }),
      resetPassword: async () => ({ error: { message: 'Auth not initialized' } }),
      updatePassword: async () => ({ error: { message: 'Auth not initialized' } }),
    };
  }
  return context;
}

export default useAuth;
