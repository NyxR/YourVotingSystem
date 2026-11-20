'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials } from '@/lib/initials';
import { cn } from '@/lib/utils';

/**
 * A person's profile picture, or their initials when they haven't chosen one
 * (or while it loads / if it fails). `name` null means a removed user.
 */
export function UserAvatar({
  name,
  src,
  className,
  fallbackClassName,
}: {
  name: string | null;
  src?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar aria-hidden className={cn('size-8 after:hidden', className)}>
      {src && <AvatarImage src={src} alt='' />}
      <AvatarFallback
        className={cn(
          'text-xs font-semibold tracking-wide',
          name ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          fallbackClassName,
        )}
      >
        {name ? initials(name) : '?'}
      </AvatarFallback>
    </Avatar>
  );
}
