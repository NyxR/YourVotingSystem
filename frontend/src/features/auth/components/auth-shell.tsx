import { BrandLogo } from '@/components/brand-logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { APP_NAME } from '@/lib/app';

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className='relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10'>
      <div className='absolute top-4 right-4 flex items-center gap-2'>
        <LanguageSwitcher className='bg-background' />
        <ThemeSwitcher className='bg-background' />
      </div>
      <div className='flex w-full max-w-sm flex-col gap-6'>
        <div className='flex flex-col items-center gap-3 self-center text-center'>
          <BrandLogo size={96} priority />
          <span className='text-lg font-semibold tracking-wide text-primary'>
            {APP_NAME}
          </span>
        </div>
        <Card>
          <CardHeader className='text-center'>
            <CardTitle className='text-xl'>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}

export function FormAlert({
  tone,
  children,
}: {
  tone: 'error' | 'success';
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={
        tone === 'error'
          ? 'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
          : 'rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground'
      }
    >
      {children}
    </div>
  );
}
