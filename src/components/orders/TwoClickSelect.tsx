import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface TwoClickSelectProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowCustomValue?: boolean;
}

export function TwoClickSelect({
  options,
  value,
  onValueChange,
  placeholder = 'SELECIONE',
  disabled = false,
  className,
  allowCustomValue = true,
}: TwoClickSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedValue, setHighlightedValue] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.value === value);
  
  // Check if value is a custom value (not in options)
  const isCustomValue = value && !selectedOption;
  const displayValue = selectedOption?.label || (isCustomValue ? value : '');

  // Filter options based on input
  const filteredOptions = inputValue
    ? options.filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase()))
    : options;

  const handleItemClick = (optionValue: string) => {
    if (highlightedValue === optionValue) {
      // Second click - confirm selection
      onValueChange(optionValue);
      setHighlightedValue(null);
      setInputValue('');
      setOpen(false);
    } else {
      // First click - highlight
      setHighlightedValue(optionValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInputValue(newValue);
    setHighlightedValue(null);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      // Check if input matches an option
      const matchedOption = options.find(
        o => o.label.toLowerCase() === inputValue.toLowerCase()
      );
      
      if (matchedOption) {
        onValueChange(matchedOption.value);
      } else if (allowCustomValue) {
        // Use custom value
        onValueChange(inputValue.trim());
      }
      setInputValue('');
      setOpen(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setHighlightedValue(null);
      setInputValue('');
    }
  };

  useEffect(() => {
    if (open && inputRef.current) {
      // Focus input when popover opens
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
          disabled={disabled}
          className={cn("w-full justify-between input-field uppercase h-12", className)}
        >
          {displayValue ? (
            <span>{displayValue.toUpperCase()}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-border" align="start">
        {/* Search/Free typing input */}
        <div className="p-3 border-b border-border">
          <Input
            ref={inputRef}
            placeholder="Digite para buscar ou adicionar..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            className="input-field uppercase"
          />
        </div>
        
        <div className="max-h-[280px] overflow-auto">
          {/* Show custom value option if typing and no exact match */}
          {inputValue.trim() && allowCustomValue && !options.some(
            o => o.label.toLowerCase() === inputValue.toLowerCase()
          ) && (
            <div
              onClick={() => {
                onValueChange(inputValue.trim());
                setInputValue('');
                setOpen(false);
              }}
              className="flex items-center justify-between px-4 py-3 cursor-pointer transition-all border-b border-border bg-primary/10 hover:bg-primary/20"
            >
              <span className="font-medium text-primary uppercase">
                USAR: "{inputValue.toUpperCase()}"
              </span>
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-primary" />
              </div>
            </div>
          )}
          
          {filteredOptions.length === 0 && !inputValue.trim() ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Nenhuma opção disponível
            </div>
          ) : filteredOptions.length === 0 && inputValue.trim() && !allowCustomValue ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Nenhuma opção encontrada
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isHighlighted = highlightedValue === option.value;
              const isSelected = value === option.value;

              return (
                <div
                  key={option.value}
                  onClick={() => handleItemClick(option.value)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 cursor-pointer transition-all border-b border-border last:border-b-0",
                    isHighlighted && "bg-primary/20 border-l-4 border-l-primary",
                    !isHighlighted && isSelected && "bg-secondary/50",
                    !isHighlighted && !isSelected && "hover:bg-secondary/30"
                  )}
                >
                  <span className="font-medium text-foreground uppercase">
                    {option.label.toUpperCase()}
                  </span>
                  
                  {isHighlighted && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="p-2 border-t border-border text-xs text-center text-muted-foreground">
          Digite livremente ou clique para selecionar
        </div>
      </PopoverContent>
    </Popover>
  );
}
