import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in',
        className
      )}
    >
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-6 gradient-primary border-0 shadow-glow hover:opacity-90"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
