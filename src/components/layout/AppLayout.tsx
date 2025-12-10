import { ReactNode } from 'react';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export const AppLayout = ({ children, showNav = true }: AppLayoutProps) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="tech-grid fixed inset-0 pointer-events-none opacity-30" />
      <main className={`relative z-10 ${showNav && user ? 'pb-20' : ''}`}>
        {children}
      </main>
      {showNav && user && <MobileNav />}
    </div>
  );
};
