import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ChecklistRequiredModalProps {
  open: boolean;
  onClose: () => void;
  onFillChecklist: () => void;
}

export function ChecklistRequiredModal({ open, onClose, onFillChecklist }: ChecklistRequiredModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-center text-xl uppercase">
            CHECKLIST OBRIGATÓRIO
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            O checklist deve ser preenchido antes de salvar a Ordem de Serviço.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          <Button variant="glow" onClick={onFillChecklist} className="w-full">
            PREENCHER CHECKLIST AGORA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
