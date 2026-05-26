/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Repo is hosted at https://stephenmelsom.github.io/honk/, so assets need
  // the /honk/ prefix in production. Dev (npm run dev) ignores `base`.
  base: process.env.NODE_ENV === 'production' ? '/honk/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    globals: false,
  },
});
