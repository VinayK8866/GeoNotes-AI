import React, { forwardRef, InputHTMLAttributes } from 'react';

export type InputVariant = 'default' | 'error';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    variant?: InputVariant;
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            variant = 'default',
            label,
            error,
            helperText,
            leftIcon,
            rightIcon,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
        const errorId = `${inputId}-error`;
        const helperId = `${inputId}-helper`;

        const baseStyles = `
      w-full px-4 py-2.5 min-h-[44px]
      text-base text-neutral-900 dark:text-neutral-100
      bg-white dark:bg-neutral-800
      border rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:opacity-50 disabled:cursor-not-allowed
      ${leftIcon ? 'pl-10' : ''}
      ${rightIcon ? 'pr-10' : ''}
      ${className}
    `;

        const variantStyles = {
            default: `
        border-neutral-300 dark:border-neutral-600
        focus:border-indigo-500 focus:ring-indigo-500
      `,
            error: `
        border-red-500 dark:border-red-500
        focus:border-red-500 focus:ring-red-500
      `
        };

        const currentVariant = error ? 'error' as InputVariant : variant;

        const combinedClassName = `
      ${baseStyles}
      ${variantStyles[currentVariant]}
    `.trim().replace(/\s+/g, ' ');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={combinedClassName}
                        aria-invalid={!!error}
                        aria-describedby={
                            error ? errorId : helperText ? helperId : undefined
                        }
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p
                        id={errorId}
                        className="mt-2 text-sm text-red-600 dark:text-red-400"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
                {helperText && !error && (
                    <p
                        id={helperId}
                        className="mt-2 text-sm text-neutral-500 dark:text-neutral-400"
                    >
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
