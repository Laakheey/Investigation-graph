// =============================================================================
// Edge Styling & Directionality Contracts (Open/Closed Principle)
// =============================================================================

import type { EdgeDirectionality, EdgeLineStyle } from "./domain";

export interface EdgeStyleConfig {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  markerStart?: string;
  markerEnd?: string;
  animated?: boolean;
}

export interface EdgeStyleOptions {
  directionality: EdgeDirectionality;
  lineStyle: EdgeLineStyle;
  strokeColor: string;
  weight?: number;
  isSelected?: boolean;
}
