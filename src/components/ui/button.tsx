"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none text-sm",
  {
    variants: {
      variant: {
        primary: "gradient-brand text-white hover:opacity-90 glow",
        secondary:
          "bg-surface-200 text-surface-800 hover:bg-surface-300 border border-surface-300",
        ghost: "text-surface-600 hover:text-surface-800 hover:bg-surface-200/50",
        outline:
          "border border-surface-300 text-surface-700 hover:bg-surface-200/50 hover:border-surface-400",
        danger: "bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/20",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";
