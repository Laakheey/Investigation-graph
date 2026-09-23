// =============================================================================
// Cambridge Intelligence ReGraph Package Shim
// When running with the commercial @cambridge-intelligence/regraph license,
// this shim is bypassed. In evaluation/development mode, this provides the
// module contract required by Next.js Webpack bundler.
// =============================================================================

import React from 'react';
import type { ChartProps, ChartApi } from 'regraph';

export const Chart: React.FC<ChartProps> | null = null;
export type { ChartProps, ChartApi };
