// For adding custom fonts with other frameworks, see:
// https://tailwindcss.com/docs/font-family
import type { Metadata } from 'next';
import { Inter, Merriweather, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/i18n/client';
import { getI18n } from '@/i18n/server';
import { APP_NAME } from '@/lib/app';
import './globals.css';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontSerif = Merriweather({
  subsets: ['latin'],
  variable: '--font-serif',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
    description: t.meta.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, t } = await getI18n();

  return (
    <html lang={locale}>
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}
      >
        <I18nProvider locale={locale} messages={t}>
          {children}
          <Toaster richColors={false} position='top-right' />
        </I18nProvider>
      </body>
    </html>
  );
}
