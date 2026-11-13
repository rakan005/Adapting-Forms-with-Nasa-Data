import { createApp } from './server.ts';

const rawPort = process.env.PORT ?? '3001';
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('PORT must be an integer from 1 to 65535');
}

createApp().listen(port, '0.0.0.0', () => {
  console.log(`Crop advisor TypeScript API listening on port ${port}`);
});
