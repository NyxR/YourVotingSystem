import { Badge } from '@/components/ui/badge';
import { RESPONSIBILITY_LABELS, type Responsibility } from '@/lib/responsibilities';
import { cn } from '@/lib/utils';

/** Small outline badges for a person's responsibilities, or a dash when none. */
export function ResponsibilityBadges({
  values,
  className,
}: {
  values: Responsibility[];
  className?: string;
}) {
  if (values.length === 0) return <span className='text-muted-foreground'>—</span>;
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {values.map((r) => (
        <Badge key={r} variant='secondary'>
          {RESPONSIBILITY_LABELS[r]}
        </Badge>
      ))}
    </div>
  );
}
