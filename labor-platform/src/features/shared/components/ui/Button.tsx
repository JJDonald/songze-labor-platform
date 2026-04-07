import { cn } from '@/features/shared/lib';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'orange' | 'ghost';
  size?: 'sm' | 'md';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border-2 font-body font-semibold cursor-pointer transition-all',
          size === 'sm' ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-base',
          {
            'bg-brand-green text-white border-brand-green hover:bg-[#1F5138] hover:-translate-y-0.5 hover:shadow-lg':
              variant === 'primary',
            'bg-brand-orange text-white border-brand-orange hover:bg-[#c95a3e] hover:-translate-y-0.5 hover:shadow-lg':
              variant === 'orange',
            'bg-transparent text-brand-green border-brand-green hover:bg-brand-green-pale':
              variant === 'ghost',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
