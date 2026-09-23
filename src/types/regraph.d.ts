// =============================================================================
// Cambridge Intelligence ReGraph TypeScript Definitions
// Module declarations for `regraph` and `@cambridge-intelligence/regraph`
// =============================================================================

declare module "regraph" {
  import { ComponentType, ReactNode } from "react";

  export interface ChartProps {
    items: Record<string, any>;
    selection?: Record<string, boolean>;
    hover?: Record<string, boolean>;
    layout?: {
      type?: "organic" | "sequential" | "radial" | "structural" | "hierarchy";
      combos?: boolean;
      animate?: boolean;
      margin?: number;
      direction?: "down" | "up" | "left" | "right";
      tightness?: number;
    };
    combo?: {
      padding?: number;
      label?: {
        fontSize?: number;
        color?: string;
      };
      shape?: "rectangle" | "polygon";
      color?: string;
      stroke?: string;
    };
    options?: {
      backgroundColor?: string;
      dragNodes?: boolean;
      navigation?: boolean;
      overview?: boolean;
      fit?: boolean;
    };
    onCreated?: (api: ChartApi) => void;
    onClick?: (event: { id?: string; item?: any; event?: any }) => void;
    onHover?: (event: { id?: string; item?: any }) => void;
    className?: string;
    children?: ReactNode;
  }

  export interface ChartApi {
    layout: (options?: {
      type?: "organic" | "sequential" | "radial" | "structural" | "hierarchy";
      combos?: boolean;
      animate?: boolean;
      tightness?: number;
    }) => Promise<void>;
    fit: (options?: { animate?: boolean; padding?: number }) => Promise<void>;
    zoom: (
      level: number | "in" | "out",
      options?: { animate?: boolean },
    ) => Promise<void>;
    export: (options?: {
      format?: "png" | "svg" | "jpeg";
      background?: string;
    }) => Promise<string>;
    destroy?: () => void;
    setItems?: (items: Record<string, any>) => void;
    getSelection?: () => Record<string, boolean>;
  }

  export const Chart: ComponentType<ChartProps>;
}

declare module "@cambridge-intelligence/regraph" {
  export * from "regraph";
}
