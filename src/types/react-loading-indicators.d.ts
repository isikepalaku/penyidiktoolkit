declare module 'react-loading-indicators' {
  import { ComponentType } from 'react';

  interface LoadingIndicatorProps {
    color?: string | string[];
    size?: 'small' | 'medium' | 'large';
    text?: string;
    textColor?: string;
    style?: React.CSSProperties;
    speedPlus?: number;
    easing?: string;
  }

  export const Mosaic: ComponentType<LoadingIndicatorProps>;
  export const Atom: ComponentType<LoadingIndicatorProps>;
  export const Commet: ComponentType<LoadingIndicatorProps>;
  export const OrbitProgress: ComponentType<LoadingIndicatorProps & { variant?: 'dotted' | 'spokes' | 'disc' | 'split-disc' | 'track-disc' }>;
  export const BlinkBlur: ComponentType<LoadingIndicatorProps>;
  export const FourSquare: ComponentType<LoadingIndicatorProps>;
  export const TrophySpin: ComponentType<LoadingIndicatorProps>;
  export const ThreeDot: ComponentType<LoadingIndicatorProps & { variant?: 'pulsate' | 'bounce' | 'bob' | 'brick-stack' }>;
  export const LifeLine: ComponentType<LoadingIndicatorProps>;
  export const Riple: ComponentType<LoadingIndicatorProps>;
  export const Slab: ComponentType<LoadingIndicatorProps>;
}
