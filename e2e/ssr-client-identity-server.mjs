import { createServer } from 'node:http';

if (process.env.SSR_IDENTITY_QA_CHILD !== '1' || !process.send) {
  throw new Error('This isolated SSR fixture must be started by its test helper.');
}

const apiOrigin = new URL(process.env.STORE_API_ORIGIN || '');
if (
  apiOrigin.protocol !== 'http:' ||
  apiOrigin.hostname !== '127.0.0.1' ||
  !apiOrigin.port ||
  apiOrigin.username ||
  apiOrigin.password ||
  apiOrigin.pathname !== '/' ||
  apiOrigin.search ||
  apiOrigin.hash
) {
  throw new Error('The isolated SSR API must be a loopback HTTP origin.');
}

// Import the actual production adapter; do not emulate its context construction.
const { reqHandler } = await import('../dist/3d-otaku/server/server.mjs');
const server = createServer((request, response) => {
  reqHandler(request, response, (error) => {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    response
      .writeHead(error ? 500 : 404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
      .end('Isolated SSR request did not render.');
  });
});

let closing = false;
function close() {
  if (closing) return;
  closing = true;
  server.closeAllConnections();
  server.close(() => process.exit(0));
}

process.on('message', (message) => {
  if (message?.type === 'close') close();
});
process.on('disconnect', close);
server.listen(0, '127.0.0.1', () => {
  process.send({ type: 'ready', port: server.address().port });
});
