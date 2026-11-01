import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * A strict Content-Security-Policy is injected at build time only, so the Vite
 * development client is not broken by its inline refresh preamble. Hosting
 * configs in public/_headers and vercel.json apply the same policy at the edge.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self'",
  "manifest-src 'self'",
  "connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'gala-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const tag = `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`;
      return html.replace('<head>', `<head>\n    ${tag}`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), cspPlugin()],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssMinify: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/zod')) {
            return 'vendor-zod';
          }
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domain/**/*.ts', 'src/ai/**/*.ts', 'src/state/**/*.ts'],
      exclude: ['src/**/*.test.{ts,tsx}'],
    },
  },
});
