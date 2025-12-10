import { useState, useRef, useEffect } from 'react';
import { Search, Edit2, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  phone: string;
  cpf?: string | null;
  address?: string | null;
}

interface ClientSelectDropdownProps {
  clients: Client[];
  selectedClient: string;
  onSelect: (clientId: string) => void;
  onEdit: (client: Client) => void;
}

export function ClientSelectDropdown({
  clients,
  selectedClient,
  onSelect,
  onEdit,
}: ClientSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.phone.includes(search)
  ).slice(0, 10);

  const selectedClientData = clients.find(c => c.id === selectedClient);

  const handleItemClick = (clientId: string) => {
    if (highlightedId === clientId) {
      // Second click - confirm selection
      onSelect(clientId);
      setHighlightedId(null);
      setOpen(false);
    } else {
      // First click - highlight
      setHighlightedId(clientId);
    }
  };

  const handleEditClick = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    onEdit(client);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setHighlightedId(null);
      setSearch('');
    }
  };

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between input-field uppercase h-12"
        >
          {selectedClientData ? (
            <span>{selectedClientData.name.toUpperCase()}</span>
          ) : (
            <span className="text-muted-foreground">SELECIONE UM CLIENTE</span>
          )}
          <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-border" align="start">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Digite nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              className="pl-9 input-field uppercase"
            />
          </div>
        </div>
        <div className="max-h-[280px] overflow-auto">
          {filteredClients.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </div>
          ) : (
            filteredClients.map((client) => {
              const isHighlighted = highlightedId === client.id;
              const isSelected = selectedClient === client.id;

              return (
                <div
                  key={client.id}
                  onClick={() => handleItemClick(client.id)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 cursor-pointer transition-all border-b border-border last:border-b-0",
                    isHighlighted && "bg-primary/20 border-l-4 border-l-primary",
                    !isHighlighted && isSelected && "bg-secondary/50",
                    !isHighlighted && !isSelected && "hover:bg-secondary/30"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground uppercase truncate">
                      {client.name.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">{client.phone}</p>
                  </div>
                  
                  {isHighlighted && (
                    <div className="flex items-center gap-2 ml-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3"
                        onClick={(e) => handleEditClick(e, client)}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                        EDITAR
                      </Button>
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="p-2 border-t border-border text-xs text-center text-muted-foreground">
          Digite para buscar, clique para destacar, clique novamente para confirmar
        </div>
      </PopoverContent>
    </Popover>
  );
}
