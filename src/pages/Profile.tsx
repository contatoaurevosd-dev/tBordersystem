import { useState, useEffect } from 'react';
import { User, Mail, Phone, LogOut, Save, Loader2, Shield, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProfileData {
  full_name: string | null;
  phone?: string | null;
}

export default function Profile() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({ full_name: null, phone: null });
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setProfile({ full_name: data.full_name, phone: null });
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Você saiu da conta');
    navigate('/auth');
  };

  const handleOpenEdit = () => {
    setEditForm({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    if (!editForm.full_name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: editForm.full_name.toUpperCase().trim(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setProfile({
        full_name: editForm.full_name.toUpperCase().trim(),
        phone: editForm.phone || null,
      });

      toast.success('Perfil atualizado com sucesso!');
      setEditModalOpen(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    atendente: 'Atendente',
    print_bridge: 'Print Bridge',
  };

  const displayName = profile.full_name || user?.user_metadata?.full_name || 'Usuário';
  const needsNameUpdate = !profile.full_name;

  return (
    <AppLayout>
      <div className="p-4 space-y-6 animate-fade-in">
        {/* Alert for missing name */}
        {needsNameUpdate && !loading && (
          <div className="glass-card p-4 border-warning/50 bg-warning/10">
            <p className="text-sm text-warning font-medium">
              ⚠️ Complete seu perfil! Cadastre seu nome para ser identificado no sistema.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 border-warning text-warning hover:bg-warning/20"
              onClick={handleOpenEdit}
            >
              Completar Perfil
            </Button>
          </div>
        )}

        {/* Profile Header */}
        <div className="glass-card-elevated p-6 text-center relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={handleOpenEdit}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          
          <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary" />
          </div>
          
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {userRole && (
                <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                  <Shield className="w-4 h-4" />
                  {roleLabels[userRole] || userRole}
                </span>
              )}
            </>
          )}
        </div>

        {/* Profile Info */}
        <div className="space-y-3">
          <h2 className="section-header">Informações</h2>
          <div className="glass-card divide-y divide-border">
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Nome Completo</p>
                <p className="text-sm font-medium text-foreground">
                  {loading ? '...' : (profile.full_name || 'Não informado')}
                </p>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da Conta
        </Button>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                placeholder="Seu nome completo"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value.toUpperCase() })}
                className="input-field uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Este nome será usado para identificar você no sistema
              </p>
            </div>
            <Button 
              onClick={handleSaveProfile} 
              className="w-full" 
              variant="glow"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
