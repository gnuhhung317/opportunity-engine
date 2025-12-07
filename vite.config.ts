import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Use '.' instead of process.cwd() to resolve the environment directory without TypeScript errors.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY is available in the client-side code
      // You must set API_KEY in your Vercel Project Settings.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});