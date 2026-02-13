import React, { forwardRef, ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            children,
            disabled,
            className = '',
            ...props
        },
        ref
    ) => {
        const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-lg
      transition-all duration-200
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${className}
    `;

        const variantStyles = {
            primary: `
        bg-indigo-600 text-white
        hover:bg-indigo-700 active:bg-indigo-800
        focus-visible:ring-indigo-500
        shadow-sm hover:shadow-md
      `,
            secondary: `
        bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
        border border-neutral-300 dark:border-neutral-600
        hover:bg-neutral-50 dark:hover:bg-neutral-700 active:bg-neutral-100 dark:active:bg-neutral-600
        focus-visible:ring-neutral-500
        shadow-sm hover:shadow
      `,
            danger: `
        bg-red-600 text-white
        hover:bg-red-700 active:bg-red-800
        focus-visible:ring-red-500
        shadow-sm hover:shadow-md
      `,
            ghost: `
        bg-transparent text-neutral-700 dark:text-neutral-300
        hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700
        focus-visible:ring-neutral-500
      `
        };

        const sizeStyles = {
            sm: 'px-3 py-1.5 text-sm min-h-[36px]',
            md: 'px-4 py-2.5 text-base min-h-[44px]',
            lg: 'px-6 py-3 text-lg min-h-[48px]'
        };

        const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
    `.trim().replace(/\s+/g, ' ');

        return (
            <button
                ref={ref}
                className={combinedClassName}
                disabled={disabled || isLoading}
                aria-busy={isLoading}
                {...props}
            >
                {isLoading && (
                    <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                )}
                {leftIcon && <span className="mr-2" aria-hidden="true">{leftIcon}</span>}
                {children}
                {rightIcon && <span className="ml-2" aria-hidden="true">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';
