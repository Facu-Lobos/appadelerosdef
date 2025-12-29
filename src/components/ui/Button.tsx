import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    icon?: React.ElementType;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, icon: Icon, children, disabled, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none';

        const variants = {
            primary: 'bg-primary text-background hover:bg-opacity-90 shadow-lg shadow-primary/20',
            secondary: 'bg-secondary text-white hover:bg-opacity-90 shadow-lg shadow-secondary/20',
            outline: 'border-2 border-primary text-primary hover:bg-primary/10',
            ghost: 'text-gray-400 hover:text-white hover:bg-white/5',
            danger: 'bg-red-500 text-white hover:bg-red-600',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2',
            lg: 'px-6 py-3 text-lg',
        };

        return (
            <button
                ref={ref}
                className={clsx(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : Icon ? (
                    <Icon className={clsx("mr-2 h-5 w-5", size === 'sm' && "h-4 w-4")} />
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
