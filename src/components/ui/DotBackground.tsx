import React from "react";
import { cn } from "../../utils/utils";

interface DotBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  dotColor?: string;
}

export function DotBackground({ children, className, dotColor }: DotBackgroundProps) {
  return (
    <div
      className={cn(
        "w-full dark:bg-black bg-white relative",
        dotColor ? dotColor : "dark:bg-dot-white/[0.2] bg-dot-black/[0.2]",
        className
      )}
    >
      {/* Radial gradient for the container to give a faded look */}
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      <div className="relative z-20">{children}</div>
    </div>
  );
}
