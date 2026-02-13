import React from 'react';
import { Button } from './Button';

export interface ErrorPageProps {
    code?: string;
    title?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
    code = '404',
    title = 'Page Not Found',
    message = "We couldn't find the page you're looking for. It might have been moved or deleted.",
    actionLabel = 'Go Home',
    onAction
}) => {
    return (
        <div
            className="min-h-screen flex items-center justify-center px-4 py-12 bg-neutral-50 dark:bg-neutral-900"
            role="main"
            aria-labelledby="error-title"
        >
            <div className="max-w-md w-full text-center">
                <div className="mb-8">
                    <p className="text-6xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">
                        {code}
                    </p>
                    <h1
                        id="error-title"
                        className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4"
                    >
                        {title}
                    </h1>
                    <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {message}
                    </p>
                </div>

                {onAction && (
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onAction}
                        className="min-w-[200px]"
                    >
                        {actionLabel}
                    </Button>
                )}
            </div>
        </div>
    );
};
