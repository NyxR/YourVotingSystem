'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Light / dark theme via the `.dark` class on <html> (see globals.css).
 * Defaults to the device setting; the choice is remembered per browser.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
