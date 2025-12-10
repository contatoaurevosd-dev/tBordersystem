import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  userStoreId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRoleAndStore = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, store_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return { role: null, storeId: null };
      }

      return { 
        role: data?.role as UserRole | null, 
        storeId: data?.store_id as string | null 
      };
    } catch (error) {
      console.error('Error fetching user role:', error);
      return { role: null, storeId: null };
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserRoleAndStore(session.user.id).then(({ role, storeId }) => {
              setUserRole(role);
              setUserStoreId(storeId);
            });
          }, 0);
        } else {
          setUserRole(null);
          setUserStoreId(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoleAndStore(session.user.id).then(({ role, storeId }) => {
          setUserRole(role);
          setUserStoreId(storeId);
        });
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Clear local state first regardless of server response
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserStoreId(null);
    
    // Try to sign out from server (may fail if session already expired)
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.log('Server signout failed, local state cleared');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, userStoreId, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
