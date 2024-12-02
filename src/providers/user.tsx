'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { TauriAPI } from '@/lib/tauri';

interface UserContextType {
  user: User.Information | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User.Information | null>(null);

  const refreshUser = async () => {
    try {
      const userData = await TauriAPI.Auth.getUserInfo();
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  // Initial user fetch
  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}