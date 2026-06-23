import { ReactNode } from 'react';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { locales } from '@/navigation';
import { notFound } from 'next/navigation';

type Props = {
  children: ReactNode;
  params: { locale: string };
};

export const metadata = {
  title: 'MCQ Admin Panel',
  description: 'Multiple Choice Question System Admin Control Center',
};

export default function LocaleLayout({ children, params: { locale } }: Props) {
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = useMessages();

  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
