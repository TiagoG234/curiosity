import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-mono text-xs font-medium uppercase tracking-wider transition-opacity duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-primary bg-primary text-white hover:opacity-85",
        secondary:
          "border border-border bg-transparent text-text hover:opacity-85",
        tertiary:
          "border-none bg-transparent text-muted underline hover:opacity-85",
        destructive:
          "border border-primary bg-primary text-white hover:opacity-85",
        outline:
          "border border-border-subtle bg-transparent text-text hover:border-border",
        ghost:
          "text-text hover:bg-surface"
      },
      size: {
        default: "px-md py-sm",
        sm: "px-sm py-xs text-xs",
        lg: "px-xl py-md",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
