import { createServer, loadEnv } from 'vite';

const env = { ...loadEnv('development', process.cwd(), 'VITE_'), ...process.env };
if (env.VITE_DATA_MODE !== 'firebase' || env.VITE_FIREBASE_PROJECT_ID !== 'the-bharmal-s-kitchen') {
  throw new Error('Restaurant review uses the development Firebase project. Check .env.local before starting.');
}
process.env.VITE_MULTI_RESTAURANT = 'true';
process.env.VITE_LOCAL_RESTAURANT_ID = env.VITE_LOCAL_RESTAURANT_ID || 'tbk';
process.env.VITE_PLATFORM_DOMAIN = env.VITE_PLATFORM_DOMAIN || 'eloquentsolutions.in';
const server = await createServer({ mode: 'development' });
await server.listen();
server.printUrls();
