'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthContext: Setting up auth listener');
    
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log('AuthContext: Auth state changed, user:', authUser ? authUser.email : 'null');
      setUser(authUser);
      setLoading(false);
    });

    return () => {
      console.log('AuthContext: Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  console.log('AuthContext: Rendering, user:', user?.email, 'loading:', loading);
  
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
} 