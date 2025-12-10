import { Home, Shield, User, Printer } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  roles: ('admin' | 'atendente' | 'print_bridge')[];
}

const navItems: NavItem[] = [
  { icon: <Home className="w-5 h-5" />, label: 'Início', path: '/', roles: ['admin', 'atendente'] },
  { icon: <Shield className="w-5 h-5" />, label: 'Garantias', path: '/warranties', roles: ['admin'] },
  { icon: <User className="w-5 h-5" />, label: 'Perfil', path: '/profile', roles: ['admin', 'atendente', 'print_bridge'] },
  { icon: <Printer className="w-5 h-5" />, label: 'Impressão', path: '/print-bridge', roles: ['print_bridge'] },
];

export const MobileNav = () => {
  const { userRole } = useAuth();

  const filteredItems = navItems.filter(item => 
    userRole && item.roles.includes(userRole)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around px-4 py-3">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
