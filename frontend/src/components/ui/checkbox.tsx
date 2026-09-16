import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { checkboxClass } from '@/components/ui/field';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input type="checkbox" className={cn(checkboxClass, className)} ref={ref} {...props} />
  ),
);
Checkbox.displayName = 'Checkbox';
