import { useState, useEffect } from 'react';
import { Plus, Search, Store, Users, Phone, Mail, Edit2, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal';
import { z } from 'zod';

// Validation schemas
const storeSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Nome da loja deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da loja deve ter no máximo 100 caracteres'),
  cnpj: z.string()
    .regex(/^$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato 00.000.000/0000-00')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^$|^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .max(200, 'Endereço deve ter no máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
});

const userSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres'),
  password: z.string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(72, 'Senha deve ter no máximo 72 caracteres'),
  fullName: z.string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  role: z.enum(['admin', 'atendente', 'print_bridge']),
  storeId: z.string().optional(),
});

const updateUserSchema = userSchema.omit({ email: true, password: true });
// Phone mask: (00) 00000-0000
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) {
    return numbers.length > 0 ? `(${numbers}` : '';
  }
  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

// CNPJ mask: 00.000.000/0000-00
const formatCnpj = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) {
    return numbers;
  }
  if (numbers.length <= 5) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  }
  if (numbers.length <= 8) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  }
  if (numbers.length <= 12) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  }
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

interface StoreData {
  id: string;
  name: string;
  cnpj?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at: string;
}

interface UserData {
  id: string;
  user_id: string;
  role: 'admin' | 'atendente' | 'print_bridge';
  store_id: string | null;
  store_name?: string;
  email?: string;
  full_name?: string;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  atendente: 'Atendente',
  print_bridge: 'Print Bridge',
};

export default function UsersAndStores() {
  const { userRole, user } = useAuth();
  const [activeTab, setActiveTab] = useState('stores');
  const [search, setSearch] = useState('');
  
  // Stores state
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreData | null>(null);
  const [storeForm, setStoreForm] = useState({ name: '', cnpj: '', phone: '', address: '' });
  const [savingStore, setSavingStore] = useState(false);
  
  // Users state
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [userForm, setUserForm] = useState({ email: '', password: '', fullName: '', role: 'atendente', storeId: '' });
  
  // Delete confirmation states
  const [deleteStoreModal, setDeleteStoreModal] = useState<{ open: boolean; store: StoreData | null }>({ open: false, store: null });
  const [deleteUserModal, setDeleteUserModal] = useState<{ open: boolean; user: UserData | null }>({ open: false, user: null });
  const [savingUser, setSavingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      setLoadingStores(true);
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .order('name');

        if (error) throw error;
        setStores(data || []);
      } catch (error: any) {
        console.error('Error fetching stores:', error);
        toast.error('Erro ao carregar lojas');
      } finally {
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, []);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select(`
            id,
            user_id,
            role,
            store_id,
            created_at,
            stores:store_id (name)
          `)
          .order('created_at', { ascending: false });

        if (rolesError) throw rolesError;

        // Fetch profiles for each user
        const usersWithProfiles = await Promise.all(
          (rolesData || []).map(async (role: any) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', role.user_id)
              .maybeSingle();

            return {
              id: role.id,
              user_id: role.user_id,
              role: role.role,
              store_id: role.store_id,
              store_name: role.role === 'admin' && !role.store_id 
                ? 'Todas as lojas' 
                : (role.stores?.name || 'Sem loja'),
              full_name: profile?.full_name || 'Usuário',
              created_at: role.created_at,
            };
          })
        );

        setUsers(usersWithProfiles);
      } catch (error: any) {
        console.error('Error fetching users:', error);
        toast.error('Erro ao carregar usuários');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.store_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Store handlers
  const handleOpenStoreModal = (store?: StoreData) => {
    if (store) {
      setEditingStore(store);
      setStoreForm({
        name: store.name,
        cnpj: store.cnpj || '',
        phone: store.phone || '',
        address: store.address || '',
      });
    } else {
      setEditingStore(null);
      setStoreForm({ name: '', cnpj: '', phone: '', address: '' });
    }
    setStoreModalOpen(true);
  };

  const handleSaveStore = async () => {
    const validation = storeSchema.safeParse(storeForm);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSavingStore(true);

    try {
      if (editingStore) {
        const { error } = await supabase
          .from('stores')
          .update({
            name: storeForm.name.toUpperCase(),
            cnpj: storeForm.cnpj || null,
            phone: storeForm.phone || null,
            address: storeForm.address.toUpperCase() || null,
          })
          .eq('id', editingStore.id);

        if (error) throw error;

        setStores(prev => prev.map(s => 
          s.id === editingStore.id 
            ? { ...s, ...storeForm, name: storeForm.name.toUpperCase(), address: storeForm.address.toUpperCase() }
            : s
        ));
        toast.success('Loja atualizada!');
      } else {
        const { data, error } = await supabase
          .from('stores')
          .insert({
            name: storeForm.name.toUpperCase(),
            cnpj: storeForm.cnpj || null,
            phone: storeForm.phone || null,
            address: storeForm.address.toUpperCase() || null,
          })
          .select()
          .single();

        if (error) throw error;

        setStores(prev => [...prev, data]);
        toast.success('Loja cadastrada!');
      }

      setStoreModalOpen(false);
    } catch (error: any) {
      console.error('Error saving store:', error);
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSavingStore(false);
    }
  };

  const handleDeleteStore = async () => {
    const store = deleteStoreModal.store;
    if (!store) return;

    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', store.id);

      if (error) throw error;

      setStores(prev => prev.filter(s => s.id !== store.id));
      toast.success('Loja excluída!');
    } catch (error: any) {
      console.error('Error deleting store:', error);
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setDeleteStoreModal({ open: false, store: null });
    }
  };

  // User handlers
  const handleOpenUserModal = (userToEdit?: UserData) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setUserForm({
        email: '',
        password: '',
        fullName: userToEdit.full_name || '',
        role: userToEdit.role,
        storeId: userToEdit.store_id || '',
      });
    } else {
      setEditingUser(null);
      setUserForm({ email: '', password: '', fullName: '', role: 'atendente', storeId: '' });
    }
    setUserModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    const isAdmin = userForm.role === 'admin';
    const validation = updateUserSchema.safeParse(userForm);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    if (!isAdmin && !userForm.storeId) {
      toast.error('Selecione uma loja para este usuário');
      return;
    }

    setSavingUser(true);

    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: userForm.fullName.toUpperCase() })
        .eq('id', editingUser.user_id);

      if (profileError) throw profileError;

      // Update role and store
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({
          role: userForm.role as any,
          store_id: userForm.storeId || null,
        })
        .eq('id', editingUser.id);

      if (roleError) throw roleError;

      const storeName = userForm.storeId 
        ? stores.find(s => s.id === userForm.storeId)?.name || 'Sem loja'
        : 'Todas as lojas';

      setUsers(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, full_name: userForm.fullName.toUpperCase(), role: userForm.role as any, store_id: userForm.storeId || null, store_name: storeName }
          : u
      ));

      toast.success('Usuário atualizado!');
      setUserModalOpen(false);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    const userToDelete = deleteUserModal.user;
    if (!userToDelete) return;

    try {
      // Delete user role first
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userToDelete.id);

      if (roleError) throw roleError;

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.user_id);

      if (profileError) console.warn('Could not delete profile:', profileError);

      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      toast.success('Usuário excluído!');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setDeleteUserModal({ open: false, user: null });
    }
  };

  const handleSaveUser = async () => {
    const isAdmin = userForm.role === 'admin';
    const validation = userSchema.safeParse(userForm);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    if (!isAdmin && !userForm.storeId) {
      toast.error('Selecione uma loja para este usuário');
      return;
    }

    setSavingUser(true);

    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: {
          data: {
            full_name: userForm.fullName.toUpperCase(),
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Add role with store
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: userForm.role as any,
            store_id: userForm.storeId || null,
          });

        if (roleError) throw roleError;

        const storeName = userForm.storeId 
          ? stores.find(s => s.id === userForm.storeId)?.name || 'Sem loja'
          : 'Todas as lojas';

        setUsers(prev => [{
          id: authData.user!.id,
          user_id: authData.user!.id,
          role: userForm.role as any,
          store_id: userForm.storeId || null,
          store_name: storeName,
          full_name: userForm.fullName.toUpperCase(),
          created_at: new Date().toISOString(),
        }, ...prev]);

        toast.success('Usuário criado! Verifique o email para confirmar.');
      }

      setUserModalOpen(false);
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário: ' + error.message);
    } finally {
      setSavingUser(false);
    }
  };

  if (userRole !== 'admin') {
    return (
      <AppLayout>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Acesso restrito a administradores</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Usuários & Lojas</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              LOJAS
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              USUÁRIOS
            </TabsTrigger>
          </TabsList>

          {/* Stores Tab */}
          <TabsContent value="stores" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lojas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 input-field"
                />
              </div>
              <Button variant="glow" size="icon" onClick={() => handleOpenStoreModal()}>
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-2">
              {loadingStores ? (
                <div className="glass-card p-6 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="glass-card p-6 text-center">
                  <p className="text-muted-foreground">Nenhuma loja cadastrada</p>
                </div>
              ) : (
                filteredStores.map((store) => (
                  <div key={store.id} className="glass-card p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Store className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{store.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {store.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {store.phone}
                          </span>
                        )}
                        {store.cnpj && <span>{store.cnpj}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenStoreModal(store)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteStoreModal({ open: true, store })}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuários..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 input-field"
                />
              </div>
              <Button variant="glow" size="icon" onClick={() => handleOpenUserModal()}>
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-2">
              {loadingUsers ? (
                <div className="glass-card p-6 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="glass-card p-6 text-center">
                  <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
                </div>
              ) : (
                filteredUsers.map((userData) => {
                  const isCurrentUser = userData.user_id === user?.id;
                  return (
                    <div key={userData.id} className="glass-card p-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {userData.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{userData.full_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">
                            {roleLabels[userData.role] || userData.role}
                          </span>
                          <span className="flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {userData.store_name}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenUserModal(userData)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {!isCurrentUser && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteUserModal({ open: true, user: userData })}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Store Modal */}
      <Dialog open={storeModalOpen} onOpenChange={setStoreModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="uppercase">{editingStore ? 'EDITAR LOJA' : 'NOVA LOJA'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">NOME *</Label>
              <Input
                placeholder="NOME DA LOJA"
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value.toUpperCase() })}
                className="input-field uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">CNPJ</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={storeForm.cnpj}
                onChange={(e) => {
                  const formatted = formatCnpj(e.target.value);
                  if (formatted.replace(/\D/g, '').length <= 14) {
                    setStoreForm({ ...storeForm, cnpj: formatted });
                  }
                }}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">TELEFONE</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={storeForm.phone}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  if (formatted.replace(/\D/g, '').length <= 11) {
                    setStoreForm({ ...storeForm, phone: formatted });
                  }
                }}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">ENDEREÇO</Label>
              <Input
                placeholder="ENDEREÇO COMPLETO"
                value={storeForm.address}
                onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value.toUpperCase() })}
                className="input-field uppercase"
              />
            </div>
            <Button onClick={handleSaveStore} className="w-full" variant="glow" disabled={savingStore}>
              {savingStore ? 'SALVANDO...' : 'SALVAR'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Modal */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="uppercase">{editingUser ? 'EDITAR USUÁRIO' : 'NOVO USUÁRIO'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">NOME COMPLETO *</Label>
              <Input
                placeholder="NOME COMPLETO"
                value={userForm.fullName}
                onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value.toUpperCase() })}
                className="input-field uppercase"
              />
            </div>
            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label className="uppercase text-muted-foreground">EMAIL *</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="uppercase text-muted-foreground">SENHA *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="input-field pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">FUNÇÃO *</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                <SelectTrigger className="input-field uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="admin">ADMINISTRADOR</SelectItem>
                  <SelectItem value="atendente">ATENDENTE</SelectItem>
                  <SelectItem value="print_bridge">PRINT BRIDGE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {userForm.role !== 'admin' && (
              <div className="space-y-2">
                <Label className="uppercase text-muted-foreground">LOJA *</Label>
                <Select value={userForm.storeId} onValueChange={(v) => setUserForm({ ...userForm, storeId: v })}>
                  <SelectTrigger className="input-field uppercase">
                    <SelectValue placeholder="SELECIONE UMA LOJA" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {userForm.role === 'admin' && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  Administradores têm acesso a <span className="text-primary font-medium">todas as lojas</span> do sistema.
                </p>
              </div>
            )}
            <Button 
              onClick={editingUser ? handleUpdateUser : handleSaveUser} 
              className="w-full" 
              variant="glow" 
              disabled={savingUser}
            >
              {savingUser ? 'SALVANDO...' : editingUser ? 'SALVAR' : 'CRIAR USUÁRIO'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Store Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteStoreModal.open}
        onClose={() => setDeleteStoreModal({ open: false, store: null })}
        onConfirm={handleDeleteStore}
        itemName={deleteStoreModal.store?.name}
      />

      {/* Delete User Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteUserModal.open}
        onClose={() => setDeleteUserModal({ open: false, user: null })}
        onConfirm={handleDeleteUser}
        itemName={deleteUserModal.user?.full_name}
      />
    </AppLayout>
  );
}
