import { useState } from 'react';
import { Smartphone, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TwoClickSelect } from '@/components/orders/TwoClickSelect';

interface ChecklistModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (type: 'android' | 'ios', data: Record<string, string>) => void;
  orderCode?: string;
}

const statusOptions = [
  { value: 'working', label: 'Funcionando' },
  { value: 'defective', label: 'Com Defeito' },
  { value: 'not_tested', label: 'Não Testado' },
  { value: 'not_available', label: 'Não Possui' },
];

const androidChecklist = [
  { id: 'screen', label: 'Tela / Display' },
  { id: 'touch', label: 'Touch Screen' },
  { id: 'speaker', label: 'Alto-falante' },
  { id: 'earpiece', label: 'Auricular' },
  { id: 'microphone', label: 'Microfone' },
  { id: 'camera_front', label: 'Câmera Frontal' },
  { id: 'camera_back', label: 'Câmera Traseira' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'bluetooth', label: 'Bluetooth' },
  { id: 'mobile_data', label: 'Dados Móveis' },
  { id: 'charging', label: 'Carregamento' },
  { id: 'battery', label: 'Bateria' },
  { id: 'fingerprint', label: 'Biometria / Digital' },
  { id: 'buttons_volume', label: 'Botões de Volume' },
  { id: 'button_power', label: 'Botão Power' },
  { id: 'sim_tray', label: 'Bandeja do Chip' },
  { id: 'sim_card', label: 'Leitura do Chip' },
  { id: 'vibration', label: 'Vibração' },
  { id: 'proximity_sensor', label: 'Sensor de Proximidade' },
  { id: 'gyroscope', label: 'Giroscópio' },
  { id: 'gps', label: 'GPS' },
  { id: 'nfc', label: 'NFC' },
  { id: 'flash', label: 'Flash' },
  { id: 'sd_card', label: 'Slot SD Card' },
];

const iosChecklist = [
  { id: 'screen', label: 'Tela / Display' },
  { id: 'touch', label: 'Touch Screen' },
  { id: '3d_touch', label: '3D Touch / Haptic Touch' },
  { id: 'face_id', label: 'Face ID' },
  { id: 'touch_id', label: 'Touch ID' },
  { id: 'speaker', label: 'Alto-falante' },
  { id: 'earpiece', label: 'Auricular' },
  { id: 'microphone', label: 'Microfone' },
  { id: 'camera_front', label: 'Câmera Frontal (TrueDepth)' },
  { id: 'camera_back', label: 'Câmera Traseira' },
  { id: 'camera_ultrawide', label: 'Câmera Ultra Angular' },
  { id: 'lidar', label: 'Scanner LiDAR' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'bluetooth', label: 'Bluetooth' },
  { id: 'mobile_data', label: 'Dados Móveis' },
  { id: 'charging', label: 'Carregamento Lightning/USB-C' },
  { id: 'wireless_charging', label: 'Carregamento Sem Fio' },
  { id: 'battery', label: 'Bateria' },
  { id: 'buttons_volume', label: 'Botões de Volume' },
  { id: 'button_power', label: 'Botão Lateral' },
  { id: 'silent_switch', label: 'Chave Silencioso' },
  { id: 'sim_tray', label: 'Bandeja do Chip' },
  { id: 'sim_card', label: 'Leitura do Chip / eSIM' },
  { id: 'vibration', label: 'Taptic Engine' },
  { id: 'proximity_sensor', label: 'Sensor de Proximidade' },
  { id: 'gyroscope', label: 'Giroscópio' },
  { id: 'gps', label: 'GPS' },
  { id: 'nfc', label: 'NFC / Apple Pay' },
  { id: 'flash', label: 'Flash True Tone' },
  { id: 'truetone_display', label: 'True Tone Display' },
];

type Step = 'select' | 'checklist';

export const ChecklistModal = ({ open, onClose, onComplete, orderCode = 'NOVA O.S.' }: ChecklistModalProps) => {
  const [step, setStep] = useState<Step>('select');
  const [type, setType] = useState<'android' | 'ios'>('android');
  const [itemStatus, setItemStatus] = useState<Record<string, string>>({});

  const checklist = type === 'android' ? androidChecklist : iosChecklist;

  const handleSelectType = (selectedType: 'android' | 'ios') => {
    setType(selectedType);
    // Initialize all items as empty (blank)
    const initialStatus: Record<string, string> = {};
    const list = selectedType === 'android' ? androidChecklist : iosChecklist;
    list.forEach(item => {
      initialStatus[item.id] = '';
    });
    setItemStatus(initialStatus);
    setStep('checklist');
  };

  const handleStatusChange = (itemId: string, status: string) => {
    setItemStatus(prev => ({ ...prev, [itemId]: status }));
  };

  const handleComplete = () => {
    onComplete(type, itemStatus);
    setStep('select');
    setItemStatus({});
    onClose();
  };

  const handleBack = () => {
    setStep('select');
    setItemStatus({});
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-lg bg-card border-border [&>button]:hidden max-h-[90vh] overflow-hidden flex flex-col" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase mb-1">ORDEM DE SERVIÇO</p>
            <p className="text-lg font-bold text-primary">{orderCode}</p>
          </div>
          <DialogTitle className="text-center mt-2">
            {step === 'select' ? 'Selecione o Sistema' : `Checklist ${type === 'android' ? 'Android' : 'iOS'}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={() => handleSelectType('android')}
              className="glass-card p-6 flex flex-col items-center gap-3 hover:border-primary/50 transition-colors"
            >
              <Smartphone className="w-12 h-12 text-success" />
              <span className="font-semibold">Android</span>
            </button>
            <button
              onClick={() => handleSelectType('ios')}
              className="glass-card p-6 flex flex-col items-center gap-3 hover:border-primary/50 transition-colors"
            >
              <Apple className="w-12 h-12 text-muted-foreground" />
              <span className="font-semibold">iOS</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 py-2">
              {checklist.map((item) => (
                <div key={item.id} className="space-y-1.5">
                  <Label className="text-sm text-foreground uppercase">{item.label}</Label>
                  <TwoClickSelect
                    options={statusOptions}
                    value={itemStatus[item.id] || ''}
                    onValueChange={(value) => handleStatusChange(item.id, value)}
                    placeholder="SELECIONE O STATUS"
                    className="h-10"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-4 shrink-0 border-t border-border mt-2">
              <Button variant="outline" className="flex-1" onClick={handleBack}>
                VOLTAR
              </Button>
              <Button variant="glow" className="flex-1" onClick={handleComplete}>
                CONFIRMAR
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
