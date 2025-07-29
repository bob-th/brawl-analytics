import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

type AuthContextType = {
  session: Session | null;
  accountType: 'user' | 'club' | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  accountType: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [accountType, setAccountType] = useState<'user' | 'club' | null>(null);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
    setSession(null);
    setAccountType(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setAccountType(session.user.user_metadata.account_type);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setAccountType(session.user.user_metadata.account_type);
      } else {
        setAccountType(null);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ session, accountType, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
