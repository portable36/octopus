import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { fieldClass } from '@/components/ui/field';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(fieldClass, 'min-h-[5rem] h-auto py-2', className)}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
