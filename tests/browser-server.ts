import { createStub, listen, close } from './support/stub.ts';
const stub = createStub();
const endpoint = await listen(stub.server);
// All values are fictional and process-local. Never contact an external model.
process.env.IZAKAYA_LLM_BASE_URL = endpoint + '/v1';
process.env.IZAKAYA_LLM_MODEL = 'fictional-stub';
process.env.IZAKAYA_LLM_API_KEY = 'fictional-test-key-never-in-client';
const { createServer } = await import('vite');
const app = await createServer({ server: { host: '127.0.0.1', port: 4314, strictPort: true } });
await app.listen();
const shutdown = async () => { await app.close(); await close(stub.server); process.exit(0); };
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
