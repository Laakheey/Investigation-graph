// =============================================================================
// Auth0 v4 Client Singleton
// Import `auth0` wherever you need session access on the server.
// =============================================================================

import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  // All config auto-loaded from env vars:
  //   AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL
  signInReturnToPath: '/dashboard',
});
