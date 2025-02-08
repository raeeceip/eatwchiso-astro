// @ts-check
import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [
    react({
      include: ['**/components/**/*', '**/react/*'],
    }), 
    tailwind()
  ],
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    runtime: {
      mode: 'local',
      type: 'pages',
      bindings: {
        PUBLIC_CLOUDFLARE_WORKER_URL: { type: 'var', value: process.env.PUBLIC_CLOUDFLARE_WORKER_URL || '' },
        PUBLIC_CLOUDFLARE_API_KEY: { type: 'secret' },
        PUBLIC_RESEND_API_KEY: { type: 'secret' }
      }
    }
  }),
  vite: {
    server: {
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 3000,
        watch: {
          awaitWriteFinish: {
            stabilityThreshold: 500
          }
        }
      }
    },
    ssr: {
      noExternal: ['react-hook-form']
    },
    build: {
      minify: true
    },
    define: {
      'import.meta.env.PUBLIC_CLOUDFLARE_WORKER_URL': JSON.stringify(process.env.PUBLIC_CLOUDFLARE_WORKER_URL),
      'import.meta.env.PUBLIC_CLOUDFLARE_API_KEY': JSON.stringify(process.env.PUBLIC_CLOUDFLARE_API_KEY),
      'import.meta.env.PUBLIC_RESEND_API_KEY': JSON.stringify(process.env.PUBLIC_RESEND_API_KEY)
    }
  }
});
