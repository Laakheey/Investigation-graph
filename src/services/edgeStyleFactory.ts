// =============================================================================
// Edge Style Factory (Open/Closed Principle & Strategy Pattern)
// -----------------------------------------------------------------------------
// SOLID:
// - Open/Closed Principle (OCP): New edge line styles, directionalities, or
//   custom marker strategies can be added by registering strategies without
//   modifying existing canvas components or Cypher queries.
// =============================================================================

import type { EdgeStyleConfig, EdgeStyleOptions } from "../types/edge";

export interface IEdgeStyleStrategy {
  compute(options: EdgeStyleOptions): EdgeStyleConfig;
}

export class DefaultEdgeStyleStrategy implements IEdgeStyleStrategy {
  compute(options: EdgeStyleOptions): EdgeStyleConfig {
    const {
      directionality,
      lineStyle,
      strokeColor,
      weight = 2,
      isSelected = false,
    } = options;

    const baseColor = isSelected ? "#F59E0B" : strokeColor || "#2563EB";
    const strokeWidth = isSelected
      ? Math.max(weight + 1, 3)
      : Math.max(weight, 1.5);

    // Compute stroke dasharray based on line style
    let strokeDasharray: string | undefined;
    if (lineStyle === "dotted") {
      strokeDasharray = "3,3";
    } else if (lineStyle === "dashed") {
      strokeDasharray = "7,4";
    }

    // Compute SVG Marker IDs for directionality
    // Custom SVG markers are defined in CustomMarkerEdge.tsx
    let markerStart: string | undefined;
    let markerEnd: string | undefined;

    const markerColorSuffix = encodeURIComponent(baseColor);

    if (directionality === "single") {
      markerEnd = `url(#marker-arrow-end-${markerColorSuffix})`;
    } else if (directionality === "bidirectional") {
      markerStart = `url(#marker-arrow-start-${markerColorSuffix})`;
      markerEnd = `url(#marker-arrow-end-${markerColorSuffix})`;
    }

    return {
      stroke: baseColor,
      strokeWidth,
      strokeDasharray,
      markerStart,
      markerEnd,
      animated: isSelected || lineStyle === "dashed",
    };
  }
}

export class EdgeStyleFactory {
  private static strategy: IEdgeStyleStrategy = new DefaultEdgeStyleStrategy();

  public static setStrategy(strategy: IEdgeStyleStrategy): void {
    this.strategy = strategy;
  }

  public static createStyle(options: EdgeStyleOptions): EdgeStyleConfig {
    return this.strategy.compute(options);
  }
}
