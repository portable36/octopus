import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { fieldClass } from '@/components/ui/field';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select className={cn(fieldClass, className)} ref={ref} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
