import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { labelClass } from '@/components/ui/field';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label className={cn(labelClass, className)} ref={ref} {...props} />
));
Label.displayName = 'Label';
