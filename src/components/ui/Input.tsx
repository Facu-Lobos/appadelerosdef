import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ElementType;
    rightIcon?: React.ElementType;
    onRightIconClick?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon: Icon, rightIcon: RightIcon, onRightIconClick, ...props }, ref) => {
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
                            Icon ? 'pl-10' : 'pl-4',
                            RightIcon ? 'pr-10' : 'pr-4',
                            error
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-white/10 focus:border-primary',
                            className
                        )}
                        {...props}
                    />
                    {RightIcon && (
                        <button
                            type="button"
                            onClick={onRightIconClick}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors focus:outline-none"
                            tabIndex={-1}
                        >
                            <RightIcon size={18} />
                        </button>
                    )}
                </div>
                {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
