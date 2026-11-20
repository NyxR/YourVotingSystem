import Image from 'next/image';
import { APP_NAME } from '@/lib/app';
import { cn } from '@/lib/utils';
import logo from '../../public/Logo_VOMM.png';

/** The VOMM FJKM Moncton seal. `size` is the rendered width/height in px. */
export function BrandLogo({
  size = 24,
  className,
  priority,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={logo}
      alt={`${APP_NAME} logo`}
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 rounded-full', className)}
    />
  );
}
