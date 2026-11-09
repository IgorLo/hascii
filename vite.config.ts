import nodeAdapter from '@sveltejs/adapter-node';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },
      adapter: process.env.VERCEL === '1' ? vercelAdapter() : nodeAdapter(),
      alias: { '@': 'src' },
    }),
  ],
  test: { include: ['src/**/*.test.ts'], environment: 'node', expect: { requireAssertions: true } },
});
