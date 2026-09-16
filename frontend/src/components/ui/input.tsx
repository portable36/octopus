import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { fieldClass } from '@/components/ui/field';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input type={type} className={cn(fieldClass, className)} ref={ref} {...props} />
  ),
);
Input.displayName = 'Input';
