import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ExitConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export function ExitConfirmModal({ 
  open, 
  onClose, 
  onConfirm,
  title = "SAIR SEM SALVAR?",
  description = "Todas as informações preenchidas serão perdidas. Deseja realmente sair?"
}: ExitConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <DialogTitle className="text-center text-xl uppercase">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button variant="destructive" onClick={onConfirm} className="w-full">
            SIM, SAIR
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            CONTINUAR PREENCHENDO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
