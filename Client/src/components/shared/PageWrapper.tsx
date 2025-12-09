"use client";

import { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  title?: string;
  description?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "7xl" | "full";
  className?: string;
}

export const PageWrapper = ({
  children,
  title,
  description,
  maxWidth = "6xl",
  className = "",
}: PageWrapperProps) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    full: "max-w-full",
  };

  return (
    <div className={`h-full w-full overflow-y-auto bg-background ${className}`}>
      <div className={`${maxWidthClasses[maxWidth]} mx-auto p-4 max-md:p-2 min-h-full`}>
        {(title || description) && (
          <div className="mb-6 sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 border-b border-border">
            {title && (
              <h1 className="text-3xl font-bold text-text mb-2">{title}</h1>
            )}
            {description && (
              <p className="text-sm text-secondary-darker">{description}</p>
            )}
          </div>
        )}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

