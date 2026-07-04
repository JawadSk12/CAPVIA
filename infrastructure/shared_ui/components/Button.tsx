import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    // Styling mappings corresponding strictly to the border-radius (16px) and brand colors
    const baseStyle =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-[16px] select-none active:scale-[0.98]';

    const variantStyles = {
      primary: 'bg-[#0D47A1] hover:bg-[#0A3B85] active:bg-[#0A3066] text-white shadow-sm border border-[#0D47A1]',
      secondary: 'bg-[#42A5F5] hover:bg-[#1E88E5] active:bg-[#1565C0] text-white shadow-sm border border-[#42A5F5]',
      outline: 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-sm',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-700',
      danger: 'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-sm border border-[#EF4444]',
      success: 'bg-[#10B981] hover:bg-[#059669] text-white shadow-sm border border-[#10B981]',
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-xs font-semibold',
      md: 'px-6 py-3 text-sm font-semibold',
      lg: 'px-8 py-4 text-base font-bold',
    };

    const disabledStyle = 'opacity-50 cursor-not-allowed active:scale-100 hover:brightness-100';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyle,
          variantStyles[variant],
          sizeStyles[size],
          (disabled || isLoading) && disabledStyle,
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />}
        {!isLoading && leftIcon && <span className="mr-2 inline-flex">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
