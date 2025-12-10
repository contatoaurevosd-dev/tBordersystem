import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Plus, 
  DollarSign,
  Users,
  Package,
  Tag,
  UserCog,
  BarChart3,
  LogOut,
  Truck,
  Printer
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}

const DashboardCard = ({ icon, title, subtitle, onClick }: DashboardCardProps) => (
  <button
    onClick={onClick}
    className="flex flex-col items-start p-4 rounded-2xl bg-card border border-border/30 hover:border-primary/50 transition-all duration-200 active:scale-[0.98]"
  >
    <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-foreground text-left">{title}</h3>
    <p className="text-sm text-muted-foreground text-left">{subtitle}</p>
  </button>
);

export default function Index() {
  const { user, userRole, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    // Redirect print_bridge users to their dedicated page
    if (!loading && userRole === 'print_bridge') {
      navigate('/print-bridge');
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || userRole === 'print_bridge') return null;

  const isAdmin = userRole === 'admin';

  const adminModules = [
    { 
      icon: <ClipboardList className="w-7 h-7 text-primary-foreground" />, 
      title: 'Ordens de Serviço', 
      subtitle: 'Gerenciar ordens',
      path: '/orders'
    },
    { 
      icon: <Plus className="w-7 h-7 text-primary-foreground" />, 
      title: 'Criar O.S.', 
      subtitle: 'Nova ordem',
      path: '/orders/new'
    },
    { 
      icon: <DollarSign className="w-7 h-7 text-primary-foreground" />, 
      title: 'Caixa', 
      subtitle: 'Financeiro',
      path: '/cash'
    },
    { 
      icon: <Users className="w-7 h-7 text-primary-foreground" />, 
      title: 'Clientes', 
      subtitle: 'Gerenciar clientes',
      path: '/clients'
    },
    { 
      icon: <Package className="w-7 h-7 text-primary-foreground" />, 
      title: 'Estoque', 
      subtitle: 'Peças e produtos',
      path: '/stock'
    },
    { 
      icon: <Tag className="w-7 h-7 text-primary-foreground" />, 
      title: 'Marcas & Modelos', 
      subtitle: 'Gerenciar catálogo',
      path: '/brands'
    },
    { 
      icon: <UserCog className="w-7 h-7 text-primary-foreground" />, 
      title: 'Usuários & Lojas', 
      subtitle: 'Gerenciar acessos',
      path: '/users'
    },
    { 
      icon: <BarChart3 className="w-7 h-7 text-primary-foreground" />, 
      title: 'Relatórios', 
      subtitle: 'Auditorias',
      path: '/reports'
    },
    { 
      icon: <Truck className="w-7 h-7 text-primary-foreground" />, 
      title: 'Entregas', 
      subtitle: 'Gerenciar entregas',
      path: '/deliveries'
    },
    { 
      icon: <Printer className="w-7 h-7 text-primary-foreground" />, 
      title: 'Impressora', 
      subtitle: 'Conexão local',
      path: '/printer'
    },
  ];

  const atendenteModules = [
    { 
      icon: <ClipboardList className="w-7 h-7 text-primary-foreground" />, 
      title: 'Ordens de Serviço', 
      subtitle: 'Gerenciar ordens',
      path: '/orders'
    },
    { 
      icon: <Plus className="w-7 h-7 text-primary-foreground" />, 
      title: 'Criar O.S.', 
      subtitle: 'Nova ordem',
      path: '/orders/new'
    },
    { 
      icon: <DollarSign className="w-7 h-7 text-primary-foreground" />, 
      title: 'Caixa', 
      subtitle: 'Financeiro',
      path: '/cash'
    },
    { 
      icon: <Users className="w-7 h-7 text-primary-foreground" />, 
      title: 'Clientes', 
      subtitle: 'Gerenciar clientes',
      path: '/clients'
    },
  ];

  const modules = isAdmin ? adminModules : atendenteModules;

  return (
    <AppLayout>
      <div className="p-4 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">OrderSistem</h1>
            <p className="text-sm text-muted-foreground">
              Gestão de Ordens
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <NotificationCenter />}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={signOut}
              className="rounded-xl border-border/50"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-2 gap-3">
          {modules.map((module) => (
            <DashboardCard
              key={module.path}
              icon={module.icon}
              title={module.title}
              subtitle={module.subtitle}
              onClick={() => navigate(module.path)}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
