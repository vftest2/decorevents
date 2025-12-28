import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
}

// Format phone number as (DD) XXXXXXXXX
const formatPhone = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Limit to 11 digits (DD + 9 digits)
  const limited = digits.slice(0, 11);
  
  if (limited.length === 0) return '';
  if (limited.length <= 2) return `(${limited}`;
  
  const dd = limited.slice(0, 2);
  const number = limited.slice(2);
  
  return `(${dd}) ${number}`;
};

// Extract only digits from formatted phone
export const extractPhoneDigits = (formatted: string): string => {
  return formatted.replace(/\D/g, '');
};

// Format phone for API - just return digits, the edge function will add 55
export const formatPhoneForApi = (phone: string): string => {
  return extractPhoneDigits(phone);
};

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = '', onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      onChange?.(formatted);
    };

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        value={formatPhone(value)}
        onChange={handleChange}
        placeholder="(00) 000000000"
        className={cn(className)}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput, formatPhone };
