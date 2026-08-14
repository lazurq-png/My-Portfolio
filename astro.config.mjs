// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig(/** @type {any} */({
  headers: [
    {
      src: [],
      'set-header': 'Content-Security-Policy',
      value:
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://cdn.astro.build; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https:; font-src https:; connect-src 'self'",
    },
    {
      src: [],
      'set-header': 'X-Frame-Options',
      value: 'DENY',
    },
    {
      src: [],
      'set-header': 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      src: [],
      'set-header': 'Strict-Transport-Security',
      value:
        'max-age=31536000; includeSubDomains; preload',
    },
    {
      src: [],
      'set-header': 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
  ],
}));