import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CloseConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export function CloseConfirmModal({ 
  open, 
  onClose, 
  onConfirm,
  title = "FECHAR SEM SALVAR?",
  description = "As informações preenchidas serão perdidas. Deseja realmente fechar?"
}: CloseConfirmModalProps) {
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
            SIM, FECHAR
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            CONTINUAR PREENCHENDO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage close confirmation state
export function useCloseConfirmation(onActualClose: () => void) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCloseAttempt = () => {
    setShowConfirm(true);
  };

  const handleConfirmClose = () => {
    setShowConfirm(false);
    onActualClose();
  };

  const handleCancelClose = () => {
    setShowConfirm(false);
  };

  return {
    showConfirm,
    handleCloseAttempt,
    handleConfirmClose,
    handleCancelClose,
  };
}
