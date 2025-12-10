import { useState, useEffect } from 'react';
import { Pencil, Trash2, Loader2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Brand {
  id: string;
  name: string;
  created_at: string;
}

interface Model {
  id: string;
  name: string;
  brand_id: string;
  created_at: string;
  brand?: Brand;
}

export default function Brands() {
  const [activeTab, setActiveTab] = useState('brands');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchBrand, setSearchBrand] = useState('');
  const [searchModel, setSearchModel] = useState('');

  // Edit Brand Modal
  const [editBrandOpen, setEditBrandOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');
  const [savingBrand, setSavingBrand] = useState(false);

  // Edit Model Modal
  const [editModelOpen, setEditModelOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [modelName, setModelName] = useState('');
  const [modelBrandId, setModelBrandId] = useState('');
  const [savingModel, setSavingModel] = useState(false);

  // Delete Dialogs
  const [deleteBrandOpen, setDeleteBrandOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [deleteModelOpen, setDeleteModelOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null);
  const [deleting, setDeleting] = useState(false);

  // New Brand/Model
  const [newBrandOpen, setNewBrandOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelOpen, setNewModelOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelBrandId, setNewModelBrandId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [brandsRes, modelsRes] = await Promise.all([
        supabase.from('brands').select('*').order('name'),
        supabase.from('models').select('*, brand:brands(id, name)').order('name'),
      ]);

      if (brandsRes.error) throw brandsRes.error;
      if (modelsRes.error) throw modelsRes.error;

      setBrands(brandsRes.data || []);
      setModels(modelsRes.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Brand handlers
  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setEditBrandOpen(true);
  };

  const handleSaveBrand = async () => {
    if (!editingBrand || !brandName.trim()) return;
    setSavingBrand(true);
    try {
      const { error } = await supabase
        .from('brands')
        .update({ name: brandName.trim().toUpperCase() })
        .eq('id', editingBrand.id);

      if (error) throw error;

      setBrands(prev =>
        prev.map(b => (b.id === editingBrand.id ? { ...b, name: brandName.trim().toUpperCase() } : b))
      );
      toast.success('Marca atualizada com sucesso');
      setEditBrandOpen(false);
      setEditingBrand(null);
    } catch (error: any) {
      toast.error('Erro ao atualizar marca: ' + error.message);
    } finally {
      setSavingBrand(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!brandToDelete) return;
    setDeleting(true);
    try {
      // Check if brand has models
      const { data: linkedModels } = await supabase
        .from('models')
        .select('id')
        .eq('brand_id', brandToDelete.id)
        .limit(1);

      if (linkedModels && linkedModels.length > 0) {
        toast.error('Não é possível excluir uma marca que possui modelos cadastrados');
        setDeleteBrandOpen(false);
        setBrandToDelete(null);
        return;
      }

      const { error } = await supabase.from('brands').delete().eq('id', brandToDelete.id);

      if (error) throw error;

      setBrands(prev => prev.filter(b => b.id !== brandToDelete.id));
      toast.success('Marca excluída com sucesso');
      setDeleteBrandOpen(false);
      setBrandToDelete(null);
    } catch (error: any) {
      toast.error('Erro ao excluir marca: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    setSavingBrand(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .insert({ name: newBrandName.trim().toUpperCase() })
        .select()
        .single();

      if (error) throw error;

      setBrands(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Marca cadastrada com sucesso');
      setNewBrandOpen(false);
      setNewBrandName('');
    } catch (error: any) {
      toast.error('Erro ao cadastrar marca: ' + error.message);
    } finally {
      setSavingBrand(false);
    }
  };

  // Model handlers
  const handleEditModel = (model: Model) => {
    setEditingModel(model);
    setModelName(model.name);
    setModelBrandId(model.brand_id);
    setEditModelOpen(true);
  };

  const handleSaveModel = async () => {
    if (!editingModel || !modelName.trim() || !modelBrandId) return;
    setSavingModel(true);
    try {
      const { error } = await supabase
        .from('models')
        .update({ name: modelName.trim().toUpperCase(), brand_id: modelBrandId })
        .eq('id', editingModel.id);

      if (error) throw error;

      const updatedBrand = brands.find(b => b.id === modelBrandId);
      setModels(prev =>
        prev.map(m =>
          m.id === editingModel.id
            ? { ...m, name: modelName.trim().toUpperCase(), brand_id: modelBrandId, brand: updatedBrand }
            : m
        )
      );
      toast.success('Modelo atualizado com sucesso');
      setEditModelOpen(false);
      setEditingModel(null);
    } catch (error: any) {
      toast.error('Erro ao atualizar modelo: ' + error.message);
    } finally {
      setSavingModel(false);
    }
  };

  const handleDeleteModel = async () => {
    if (!modelToDelete) return;
    setDeleting(true);
    try {
      // Check if model is used in service orders
      const { data: linkedOrders } = await supabase
        .from('service_orders')
        .select('id')
        .eq('model_id', modelToDelete.id)
        .limit(1);

      if (linkedOrders && linkedOrders.length > 0) {
        toast.error('Não é possível excluir um modelo que está em uso em ordens de serviço');
        setDeleteModelOpen(false);
        setModelToDelete(null);
        return;
      }

      const { error } = await supabase.from('models').delete().eq('id', modelToDelete.id);

      if (error) throw error;

      setModels(prev => prev.filter(m => m.id !== modelToDelete.id));
      toast.success('Modelo excluído com sucesso');
      setDeleteModelOpen(false);
      setModelToDelete(null);
    } catch (error: any) {
      toast.error('Erro ao excluir modelo: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateModel = async () => {
    if (!newModelName.trim() || !newModelBrandId) return;
    setSavingModel(true);
    try {
      const { data, error } = await supabase
        .from('models')
        .insert({ name: newModelName.trim().toUpperCase(), brand_id: newModelBrandId })
        .select('*, brand:brands(id, name)')
        .single();

      if (error) throw error;

      setModels(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Modelo cadastrado com sucesso');
      setNewModelOpen(false);
      setNewModelName('');
      setNewModelBrandId('');
    } catch (error: any) {
      toast.error('Erro ao cadastrar modelo: ' + error.message);
    } finally {
      setSavingModel(false);
    }
  };

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(searchBrand.toLowerCase())
  );

  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(searchModel.toLowerCase()) ||
    m.brand?.name.toLowerCase().includes(searchModel.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Marcas & Modelos</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="brands">MARCAS</TabsTrigger>
            <TabsTrigger value="models">MODELOS</TabsTrigger>
          </TabsList>

          {/* Brands Tab */}
          <TabsContent value="brands" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar marca..."
                  value={searchBrand}
                  onChange={e => setSearchBrand(e.target.value)}
                  className="pl-9 input-field uppercase"
                />
              </div>
              <Button onClick={() => setNewBrandOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                NOVA
              </Button>
            </div>

            {loading ? (
              <div className="glass-card p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-2">Carregando...</p>
              </div>
            ) : filteredBrands.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-muted-foreground">Nenhuma marca encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBrands.map(brand => (
                  <div
                    key={brand.id}
                    className="glass-card p-4 flex items-center justify-between"
                  >
                    <span className="font-medium text-foreground uppercase">{brand.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditBrand(brand)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setBrandToDelete(brand);
                          setDeleteBrandOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar modelo ou marca..."
                  value={searchModel}
                  onChange={e => setSearchModel(e.target.value)}
                  className="pl-9 input-field uppercase"
                />
              </div>
              <Button onClick={() => setNewModelOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                NOVO
              </Button>
            </div>

            {loading ? (
              <div className="glass-card p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-2">Carregando...</p>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-muted-foreground">Nenhum modelo encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredModels.map(model => (
                  <div
                    key={model.id}
                    className="glass-card p-4 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-foreground uppercase">{model.name}</span>
                      <p className="text-sm text-muted-foreground">{model.brand?.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditModel(model)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setModelToDelete(model);
                          setDeleteModelOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Brand Modal */}
      <Dialog open={editBrandOpen} onOpenChange={setEditBrandOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>EDITAR MARCA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>NOME DA MARCA</Label>
              <Input
                value={brandName}
                onChange={e => setBrandName(e.target.value.toUpperCase())}
                className="input-field uppercase"
                placeholder="EX: APPLE"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBrandOpen(false)}>
              CANCELAR
            </Button>
            <Button onClick={handleSaveBrand} disabled={savingBrand || !brandName.trim()}>
              {savingBrand ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SALVAR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Brand Modal */}
      <Dialog open={newBrandOpen} onOpenChange={setNewBrandOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>NOVA MARCA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>NOME DA MARCA</Label>
              <Input
                value={newBrandName}
                onChange={e => setNewBrandName(e.target.value.toUpperCase())}
                className="input-field uppercase"
                placeholder="EX: SAMSUNG"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewBrandOpen(false)}>
              CANCELAR
            </Button>
            <Button onClick={handleCreateBrand} disabled={savingBrand || !newBrandName.trim()}>
              {savingBrand ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CADASTRAR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Model Modal */}
      <Dialog open={editModelOpen} onOpenChange={setEditModelOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>EDITAR MODELO</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>MARCA</Label>
              <Select value={modelBrandId} onValueChange={setModelBrandId}>
                <SelectTrigger className="input-field uppercase">
                  <SelectValue placeholder="SELECIONAR MARCA" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id} className="uppercase">
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>NOME DO MODELO</Label>
              <Input
                value={modelName}
                onChange={e => setModelName(e.target.value.toUpperCase())}
                className="input-field uppercase"
                placeholder="EX: IPHONE 15 PRO"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModelOpen(false)}>
              CANCELAR
            </Button>
            <Button onClick={handleSaveModel} disabled={savingModel || !modelName.trim() || !modelBrandId}>
              {savingModel ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SALVAR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Model Modal */}
      <Dialog open={newModelOpen} onOpenChange={setNewModelOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>NOVO MODELO</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>MARCA</Label>
              <Select value={newModelBrandId} onValueChange={setNewModelBrandId}>
                <SelectTrigger className="input-field uppercase">
                  <SelectValue placeholder="SELECIONAR MARCA" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id} className="uppercase">
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>NOME DO MODELO</Label>
              <Input
                value={newModelName}
                onChange={e => setNewModelName(e.target.value.toUpperCase())}
                className="input-field uppercase"
                placeholder="EX: GALAXY S24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewModelOpen(false)}>
              CANCELAR
            </Button>
            <Button onClick={handleCreateModel} disabled={savingModel || !newModelName.trim() || !newModelBrandId}>
              {savingModel ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CADASTRAR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Brand Confirmation */}
      <AlertDialog open={deleteBrandOpen} onOpenChange={setDeleteBrandOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>EXCLUIR MARCA</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a marca "{brandToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>CANCELAR</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBrand}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'EXCLUIR'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Model Confirmation */}
      <AlertDialog open={deleteModelOpen} onOpenChange={setDeleteModelOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>EXCLUIR MODELO</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o modelo "{modelToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>CANCELAR</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'EXCLUIR'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
