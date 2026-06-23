import { createSharedPathnamesNavigation } from 'next-intl/navigation';

export const locales = ['en', 'id'] as const;
export const defaultLocale = 'id' as const;

export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation({
  locales,
});
