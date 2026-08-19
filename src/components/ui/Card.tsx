import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function Card({ hover = false, padding = 'md', className = '', children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={`bg-white rounded-2xl border border-neutral-200 ${
        hover ? 'hover:shadow-card-hover hover:border-neutral-300 transition-all duration-300' : ''
      } ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
