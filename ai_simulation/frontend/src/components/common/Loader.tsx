import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface LoaderProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    fullScreen?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({
    size = 'md',
    text,
    fullScreen = false
}) => {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    const loader = (
        <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className={clsx(sizes[size], 'animate-spin text-primary-600')} />
            {text && <p className="text-sm text-gray-600">{text}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
                {loader}
            </div>
        );
    }

    return loader;
};