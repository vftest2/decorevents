import { useEffect } from 'react';
import { useEntity } from '@/contexts/EntityContext';

// Convert HEX to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Generate a darker version of a color for foreground
function getDarkerHSL(hsl: { h: number; s: number; l: number }): string {
  const newL = Math.max(hsl.l - 40, 10);
  return `${hsl.h} ${hsl.s}% ${newL}%`;
}

// Generate a lighter version of a color
function getLighterHSL(hsl: { h: number; s: number; l: number }): string {
  const newL = Math.min(hsl.l + 35, 95);
  return `${hsl.h} ${Math.max(hsl.s - 10, 0)}% ${newL}%`;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { currentEntity } = useEntity();

  useEffect(() => {
    if (!currentEntity) return;

    const root = document.documentElement;
    
    // Get entity colors
    const primaryColor = currentEntity.primaryColor || '#E85A4F';
    const secondaryColor = currentEntity.secondaryColor || '#F5F0EB';
    const accentColor = currentEntity.accentColor || '#E8A83C';

    // Convert to HSL
    const primaryHSL = hexToHSL(primaryColor);
    const secondaryHSL = hexToHSL(secondaryColor);
    const accentHSL = hexToHSL(accentColor);

    // Apply primary color
    root.style.setProperty('--primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    root.style.setProperty('--primary-foreground', primaryHSL.l > 50 ? '0 0% 10%' : '0 0% 98%');

    // Apply accent color
    root.style.setProperty('--accent', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
    root.style.setProperty('--accent-foreground', accentHSL.l > 50 ? '0 0% 10%' : '0 0% 98%');

    // Apply ring color (matches primary)
    root.style.setProperty('--ring', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);

    // Sidebar colors
    root.style.setProperty('--sidebar-primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    root.style.setProperty('--sidebar-primary-foreground', primaryHSL.l > 50 ? '0 0% 10%' : '0 0% 98%');
    root.style.setProperty('--sidebar-accent', getLighterHSL(primaryHSL));
    root.style.setProperty('--sidebar-accent-foreground', getDarkerHSL(primaryHSL));

    // Chart colors based on branding
    root.style.setProperty('--chart-1', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    root.style.setProperty('--chart-2', `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
    root.style.setProperty('--chart-3', `${primaryHSL.h} ${Math.max(primaryHSL.s - 20, 0)}% ${Math.min(primaryHSL.l + 15, 80)}%`);
    root.style.setProperty('--chart-4', `${accentHSL.h} ${Math.max(accentHSL.s - 20, 0)}% ${Math.min(accentHSL.l + 15, 80)}%`);
    root.style.setProperty('--chart-5', `${primaryHSL.h} ${Math.max(primaryHSL.s - 30, 0)}% ${Math.min(primaryHSL.l + 25, 85)}%`);

    // Update CSS custom properties for gradients and glows
    root.style.setProperty('--primary-glow', `${primaryHSL.h} ${Math.min(primaryHSL.s + 10, 100)}% ${Math.min(primaryHSL.l + 10, 70)}%`);

  }, [currentEntity?.primaryColor, currentEntity?.secondaryColor, currentEntity?.accentColor]);

  return <>{children}</>;
}
