import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Check, 
  Printer,
  Wifi,
  RefreshCw,
  Share,
  ArrowLeft,
  Chrome,
  Apple
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isInStandaloneMode);
      setIsInstalled(isInStandaloneMode);
    };
    
    checkInstalled();

    // Check if iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIOSDevice);
    };
    
    checkIOS();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('App instalado com sucesso!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.info('Use o menu do navegador para instalar o app');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('Instalação iniciada!');
      } else {
        toast.info('Instalação cancelada');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install error:', error);
      toast.error('Erro ao instalar');
    }
  };

  const features = [
    { icon: Printer, title: 'Impressão USB/OTG', description: 'Imprima diretamente via USB com WebUSB' },
    { icon: Wifi, title: 'Funciona Offline', description: 'Acesse dados em cache sem internet' },
    { icon: RefreshCw, title: 'Atualizações Automáticas', description: 'Sempre na versão mais recente' },
    { icon: Smartphone, title: 'Experiência Nativa', description: 'Funciona como um app real' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Instalar App</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 animate-fade-in">
        {/* App Info Card */}
        <div className="glass-card-elevated p-6 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg">
            <img 
              src="/icons/icon-192x192.png" 
              alt="OS Sync Print" 
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">OS Sync Print</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sistema de Ordens de Serviço
          </p>
          
          {isStandalone ? (
            <div className="flex items-center justify-center gap-2 text-success">
              <Check className="w-5 h-5" />
              <span className="font-medium">App instalado!</span>
            </div>
          ) : isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Para instalar no iOS:
              </p>
              <div className="flex items-center justify-center gap-2 text-primary">
                <Share className="w-5 h-5" />
                <span>Toque em Compartilhar</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Depois selecione "Adicionar à Tela de Início"
              </p>
            </div>
          ) : deferredPrompt ? (
            <Button 
              variant="glow" 
              size="lg" 
              className="w-full"
              onClick={handleInstall}
            >
              <Download className="w-5 h-5 mr-2" />
              INSTALAR AGORA
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use o menu do navegador para instalar
              </p>
              <div className="flex items-center justify-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Chrome className="w-4 h-4" />
                  <span className="text-xs">Chrome</span>
                </div>
                <span>ou</span>
                <div className="flex items-center gap-1">
                  <Monitor className="w-4 h-4" />
                  <span className="text-xs">Edge</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Recursos do App
          </h3>
          <div className="grid gap-3">
            {features.map((feature, index) => (
              <div key={index} className="glass-card p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Browser Requirements */}
        <div className="glass-card p-4">
          <h3 className="font-medium text-foreground mb-3">Navegadores Compatíveis</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span className="text-muted-foreground">Google Chrome</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span className="text-muted-foreground">Microsoft Edge</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span className="text-muted-foreground">Samsung Internet</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span className="text-muted-foreground">Safari (iOS)</span>
            </div>
          </div>
        </div>

        {/* WebUSB Note */}
        <div className="glass-card p-4 border-l-4 border-warning">
          <h3 className="font-medium text-foreground mb-2">Impressão USB</h3>
          <p className="text-sm text-muted-foreground">
            A impressão via WebUSB funciona apenas em <strong>Chrome</strong> ou <strong>Edge</strong> 
            em dispositivos Android ou computadores. Safari e Firefox não suportam WebUSB.
          </p>
        </div>

        {/* Action Button */}
        {!isStandalone && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/auth')}
          >
            Continuar no Navegador
          </Button>
        )}
      </div>
    </div>
  );
}
