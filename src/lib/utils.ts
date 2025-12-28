import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um número de telefone para o padrão internacional brasileiro: 55DDXXXXXXXXX
 * Remove todos os caracteres não numéricos e garante que começa com 55
 * @param phone - Número de telefone em qualquer formato
 * @returns Número formatado como 55DDXXXXXXXXX ou string vazia se inválido
 */
export function formatPhoneToInternational(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');
  
  // Se não tem números suficientes, retorna vazio
  if (cleaned.length < 10) return cleaned;
  
  // Se já começa com 55, mantém
  if (cleaned.startsWith('55')) {
    return cleaned;
  }
  
  // Se começa com 0, remove o zero (ex: 092999106091 -> 92999106091)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Adiciona o código do país
  return '55' + cleaned;
}

/**
 * Formata telefone para exibição: (55) 92991-06091
 * @param phone - Número no formato internacional (55DDXXXXXXXXX)
 * @returns Número formatado para exibição
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove tudo que não é número
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 10) return phone;
  
  // Se começa com 55, formata como (55) DDXXXXX-XXXX
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    const country = cleaned.substring(0, 2);
    const ddd = cleaned.substring(2, 4);
    const rest = cleaned.substring(4);
    
    if (rest.length === 9) {
      return `(${country}) ${ddd}${rest.substring(0, 5)}-${rest.substring(5)}`;
    } else if (rest.length === 8) {
      return `(${country}) ${ddd}${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    return `(${country}) ${ddd}${rest}`;
  }
  
  // Formato simples para números sem 55
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  
  return phone;
}

/**
 * Valida se um telefone está no formato internacional válido
 * @param phone - Número de telefone
 * @returns true se válido (55 + DDD + 8-9 dígitos)
 */
export function isValidBrazilianPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Deve ter pelo menos 12 dígitos (55 + DD + 8 dígitos) e no máximo 13 (55 + DD + 9 dígitos)
  if (cleaned.length < 12 || cleaned.length > 13) return false;
  
  // Deve começar com 55
  if (!cleaned.startsWith('55')) return false;
  
  return true;
}
