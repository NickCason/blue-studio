import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';
import waveformIntegration from './src/integrations/waveform.mjs';

export default defineConfig({
  site: 'https://bluestudio.space',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap(), waveformIntegration()],
  devToolbar: { enabled: false },
  vite: {
    resolve: {
      alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  },
});
