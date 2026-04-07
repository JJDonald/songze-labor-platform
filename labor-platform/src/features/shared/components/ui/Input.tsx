import { cn } from '@/features/shared/lib';
import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold mb-2 text-text">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 border-brand-sand bg-brand-cream',
            'font-body text-sm text-text outline-none transition-colors',
            'focus:border-brand-green focus:bg-white',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
