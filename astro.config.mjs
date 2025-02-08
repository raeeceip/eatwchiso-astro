// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    functionPerRoute: true,
    routes: {
      '/api/book': 'functions/api/book.js',
    },
  }),
});
