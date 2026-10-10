import { defineConfig } from 'vite';
import { createApi } from './server/api.ts';
import { readConfig } from './server/llm.ts';

export default defineConfig(() => {
  // No loadEnv/define: secrets stay in the Node process, never in client code.
  const api = createApi(readConfig(process.env));
  return { plugins: [{
    name: 'izakaya-loopback-api',
    configureServer(server) { server.middlewares.use(api); },
    configurePreviewServer(server) { server.middlewares.use(api); },
  }] };
});
