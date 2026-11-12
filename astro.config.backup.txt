// @ts-check
import { defineConfig } from 'astro/config';
import siteDashboard from './tools/site-scanner.mjs';

// https://astro.build/config
export default defineConfig({
  integrations: [siteDashboard()],
});