import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type AppRole = 'resident' | 'owner' | 'admin';

type AuthContextValue = {
  configured: boolean;
  ready: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profileMissing: boolean;
  reloadRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  configured: false,
  ready: false,
  session: null,
  user: null,
  role: null,
  profileMissing: false,
  reloadRole: async () => {},
});

function isAppRole(value: string): value is AppRole {
  return value === 'resident' || value === 'owner' || value === 'admin';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured());
  const [roleState, setRoleState] = useState<{
    userId: string;
    role: AppRole | null;
    profileMissing: boolean;
  } | null>(null);
  const roleRequest = useRef(0);

  const reloadRole = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      return;
    }

    const requestId = roleRequest.current + 1;
    roleRequest.current = requestId;
    const { data: roleRow, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (requestId !== roleRequest.current) {
      return;
    }

    const missing = Boolean(error);
    const role = roleRow && isAppRole(roleRow.role) ? roleRow.role : null;
    setRoleState({ userId, role, profileMissing: missing });
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      setSession(data.session);
      setReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!supabase || !userId) {
      return;
    }

    const requestId = roleRequest.current + 1;
    roleRequest.current = requestId;

    void supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data: roleRow, error }) => {
        if (requestId !== roleRequest.current) {
          return;
        }

        const missing = Boolean(error);
        const role = roleRow && isAppRole(roleRow.role) ? roleRow.role : null;
        setRoleState({ userId, role, profileMissing: missing });
      });
  }, [session?.user.id]);

  const currentRole = roleState?.userId === session?.user.id ? roleState : null;
  const role = currentRole?.role ?? null;
  const profileMissing = currentRole?.profileMissing ?? false;

  return (
    <AuthContext.Provider
      value={{
        configured: isSupabaseConfigured(),
        ready,
        session,
        user: session?.user ?? null,
        role,
        profileMissing,
        reloadRole,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
