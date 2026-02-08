import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always', // Always include locale prefix for proper routing
  localeDetection: true, // Enable automatic locale detection
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
