import { defineConfig, passthroughImageService } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static',
  integrations: [tailwind()],
  image: {
    // Avoid requiring `sharp` in CI/Vercel builds.
    service: passthroughImageService(),
  },
});
