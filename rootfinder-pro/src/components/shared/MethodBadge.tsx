import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MethodType } from '@/types';

const methodConfig: Record<
  MethodType,
  { label: string; className: string }
> = {
  bisection: {
    label: 'Bisección',
    className: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  },
  'false-position': {
    label: 'Regla falsa',
    className: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  },
  'newton-raphson': {
    label: 'Newton-Raphson',
    className: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  },
  secant: {
    label: 'Secante',
    className: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  },
  'fixed-point': {
    label: 'Punto fijo',
    className: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  },
  richardson: {
    label: 'Richardson',
    className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  },
  romberg: {
    label: 'Romberg',
    className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  },
};

interface MethodBadgeProps {
  method: MethodType;
  className?: string;
}

/**
 * Muestra el método numérico con una presentación compacta y consistente.
 */
export function MethodBadge({ method, className }: MethodBadgeProps) {
  const config = methodConfig[method];

  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
