import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface DeleteOrderModalProps {
  open: boolean;
  orderNumber: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteOrderModal = ({ 
  open, 
  orderNumber, 
  onClose, 
  onConfirm,
  isDeleting = false 
}: DeleteOrderModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mb-2">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Excluir O.S. #{orderNumber}?</DialogTitle>
          <DialogDescription className="text-center">
            Esta ação não pode ser desfeita. A ordem de serviço será permanentemente removida do sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={onClose}
            disabled={isDeleting}
          >
            CANCELAR
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'EXCLUINDO...' : 'EXCLUIR'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
