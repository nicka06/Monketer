import React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  children: React.ReactNode;
}

const variantClasses = {
  h1: 'text-4xl font-bold tracking-tight sm:text-5xl',
  h2: 'text-3xl font-semibold tracking-tight',
  h3: 'text-2xl font-semibold tracking-tight',
  h4: 'text-xl font-semibold tracking-tight',
  h5: 'text-lg font-semibold tracking-tight',
  h6: 'text-base font-semibold tracking-tight',
  p: 'text-base leading-7',
  span: 'text-base',
};

export const Typography: React.FC<TypographyProps> = ({ 
  variant, 
  children, 
  className,
  ...props 
}) => {
  const Component = variant;
  
  return (
    <Component 
      className={cn(
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}; 