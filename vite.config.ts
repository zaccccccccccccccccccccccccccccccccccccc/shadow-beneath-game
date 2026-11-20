import { defineConfig } from 'vite';

// Keep asset URLs relative so the game also works when hosted below a domain
// subpath (for example, a school's static-site project page).
export default defineConfig({
  base: './',
  server: { watch: { ignored: ['**/work/**'] } },
});
