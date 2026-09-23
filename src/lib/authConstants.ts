// =============================================================================
// Auth Constants & Demo Accounts (Safe for both Client & Server components)
// =============================================================================

export const SESSION_COOKIE_NAME = 'ebrr_session';

export const DEMO_ACCOUNTS = [
  {
    email: 'sarah.chen@alphacompliance.com',
    password: 'password123',
    userId: 'user_sarah_01',
    name: 'Sarah Chen, Lead Investigator',
    tenantId: 'tenant-alpha-compliance',
    tenantName: 'Alpha Compliance Corp',
    roles: ['investigator', 'admin'],
  },
  {
    email: 'marcus.vance@lexisintegrity.com',
    password: 'password123',
    userId: 'user_marcus_02',
    name: 'Marcus Vance, Senior Partner',
    tenantId: 'tenant-lexis-integrity',
    tenantName: 'Lexis Integrity Partners',
    roles: ['lead_counsel', 'admin'],
  },
];
