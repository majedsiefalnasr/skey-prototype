// PROTOTYPE, throwaway. Same as dev.mjs but on port 4180 so the main dev server on 4173 stays untouched.
import {build} from './build.mjs';
import {serve} from './serve.mjs';

const PORT = Number(process.env.PROTOTYPE_PORT || 4180);
await build();
const server = await serve({root: 'dist', port: PORT});
const address = server.address();
console.log(`Prototype serving dist/ at http://127.0.0.1:${typeof address === 'object' && address ? address.port : PORT}/`);
