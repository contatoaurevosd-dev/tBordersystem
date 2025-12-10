import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BarChart3, 
  ClipboardList, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users,
  Store,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReportsDashboard } from '@/components/reports/ReportsDashboard';
import { OrdersAudit } from '@/components/reports/OrdersAudit';
import { CashAudit } from '@/components/reports/CashAudit';
import { FinancialReport } from '@/components/reports/FinancialReport';

interface StoreOption {
  id: string;
  name: string;
}

export default function Reports() {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && userRole !== 'admin') {
      navigate('/');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    const fetchStores = async () => {
      const { data } = await supabase
        .from('stores')
        .select('id, name')
        .order('name');
      if (data) setStores(data);
    };
    fetchStores();
  }, []);

  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'current':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last3':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'last6':
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const dateRange = getDateRange();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || userRole !== 'admin') return null;

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">RELATÓRIOS & AUDITORIAS</h1>
            <p className="text-xs text-muted-foreground">Gestão e monitoramento</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="flex-1 bg-input border-border uppercase text-sm">
              <Store className="w-4 h-4 mr-2" />
              <SelectValue placeholder="TODAS AS LOJAS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="uppercase">TODAS AS LOJAS</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id} className="uppercase">
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="flex-1 bg-input border-border uppercase text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="PERÍODO" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current" className="uppercase">MÊS ATUAL</SelectItem>
              <SelectItem value="last" className="uppercase">MÊS ANTERIOR</SelectItem>
              <SelectItem value="last3" className="uppercase">ÚLTIMOS 3 MESES</SelectItem>
              <SelectItem value="last6" className="uppercase">ÚLTIMOS 6 MESES</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Period Info */}
        <div className="text-xs text-muted-foreground text-center">
          {format(dateRange.start, "dd 'de' MMMM", { locale: ptBR })} até{' '}
          {format(dateRange.end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-secondary/50 p-1">
            <TabsTrigger value="dashboard" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="cash" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <ReportsDashboard 
              storeId={selectedStore === 'all' ? null : selectedStore}
              dateRange={dateRange}
            />
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <OrdersAudit 
              storeId={selectedStore === 'all' ? null : selectedStore}
              dateRange={dateRange}
            />
          </TabsContent>

          <TabsContent value="cash" className="mt-4">
            <CashAudit 
              storeId={selectedStore === 'all' ? null : selectedStore}
              dateRange={dateRange}
            />
          </TabsContent>

          <TabsContent value="financial" className="mt-4">
            <FinancialReport 
              storeId={selectedStore === 'all' ? null : selectedStore}
              dateRange={dateRange}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
