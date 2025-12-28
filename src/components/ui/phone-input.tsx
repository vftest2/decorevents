import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatPhoneToInternational, formatPhoneForDisplay } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  showFormatted?: boolean;
}

/**
 * Input de telefone que automaticamente converte para o formato internacional brasileiro
 * Formato de saída: 55DDXXXXXXXXX (apenas números)
 */
const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, showFormatted = true, ...props }, ref) => {
    // Exibe o valor formatado para o usuário
    const displayValue = showFormatted && value ? formatPhoneForDisplay(value) : value;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      // Se o usuário está digitando, mantém o valor como está para UX
      // Quando perde o foco, será formatado
      const numbersOnly = rawValue.replace(/\D/g, '');
      
      // Se tem números suficientes, formata para o padrão internacional
      if (numbersOnly.length >= 10) {
        onChange(formatPhoneToInternational(numbersOnly));
      } else {
        // Mantém apenas os números durante a digitação
        onChange(numbersOnly);
      }
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Ao perder o foco, garante que está no formato correto
      if (value) {
        const formatted = formatPhoneToInternational(value);
        if (formatted !== value) {
          onChange(formatted);
        }
      }
      props.onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
