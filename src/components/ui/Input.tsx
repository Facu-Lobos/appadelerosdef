import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ElementType;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon: Icon, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {Icon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                            <Icon size={18} />
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={clsx(
                            'w-full bg-background border rounded-lg py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50',
                            Icon ? 'pl-10 pr-4' : 'px-4',
                            error
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-white/10 focus:border-primary',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
