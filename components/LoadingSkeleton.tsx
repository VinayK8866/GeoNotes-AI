import React from 'react';

export interface LoadingSkeletonProps {
    variant?: 'card' | 'header' | 'map' | 'text';
    className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
    variant = 'card',
    className = ''
}) => {
    const baseStyles = 'animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded';

    const variants = {
        card: (
            <div className={`p-4 ${className}`}>
                <div className={`${baseStyles} h-6 w-3/4 mb-3`}></div>
                <div className={`${baseStyles} h-4 w-full mb-2`}></div>
                <div className={`${baseStyles} h-4 w-5/6 mb-2`}></div>
                <div className={`${baseStyles} h-4 w-4/6`}></div>
                <div className="mt-4 flex gap-2">
                    <div className={`${baseStyles} h-8 w-16`}></div>
                    <div className={`${baseStyles} h-8 w-16`}></div>
                </div>
            </div>
        ),
        header: (
            <div className={`flex items-center justify-between p-4 ${className}`}>
                <div className={`${baseStyles} h-8 w-32`}></div>
                <div className="flex gap-2">
                    <div className={`${baseStyles} h-10 w-10 rounded-full`}></div>
                    <div className={`${baseStyles} h-10 w-10 rounded-full`}></div>
                </div>
            </div>
        ),
        map: (
            <div className={`${baseStyles} w-full h-64 ${className}`}></div>
        ),
        text: (
            <div className={className}>
                <div className={`${baseStyles} h-4 w-full mb-2`}></div>
                <div className={`${baseStyles} h-4 w-5/6`}></div>
            </div>
        )
    };

    return variants[variant];
};
