import { AlertTriangle } from 'lucide-react';
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

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemName?: string;
}

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "CONFIRMAR EXCLUSÃO",
  description,
  itemName,
}: DeleteConfirmModalProps) {
  const displayDescription = description || `Deseja realmente excluir "${itemName}"? Esta ação não pode ser desfeita.`;

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="bg-card border-border max-w-sm">
        <AlertDialogHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {displayDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            SIM, EXCLUIR
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={onClose}
            className="w-full mt-0"
          >
            CANCELAR
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
