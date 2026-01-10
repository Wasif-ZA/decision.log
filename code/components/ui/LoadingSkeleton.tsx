// ===========================================
// Loading Skeleton Component
// ===========================================

interface LoadingSkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    lines?: number;
}

export function LoadingSkeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    lines = 1,
}: LoadingSkeletonProps) {
    const baseClasses = 'animate-pulse bg-base-200';

    const variantClasses = {
        text: 'rounded h-4',
        circular: 'rounded-full',
        rectangular: 'rounded-md',
    };

    const style: React.CSSProperties = {
        width: width ?? (variant === 'text' ? '100%' : undefined),
        height: height ?? (variant === 'circular' ? width : undefined),
    };

    if (lines > 1 && variant === 'text') {
        return (
            <div className={`space-y-2 ${className}`}>
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={`${baseClasses} ${variantClasses.text}`}
                        style={{
                            ...style,
                            width: i === lines - 1 ? '75%' : '100%', // Last line is shorter
                        }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
}

// ===========================================
// Common Skeleton Patterns
// ===========================================

export function CardSkeleton() {
    return (
        <div className="border border-base-200 rounded-lg p-4 space-y-3">
            <LoadingSkeleton variant="text" width="60%" />
            <LoadingSkeleton variant="text" lines={3} />
            <div className="flex gap-2">
                <LoadingSkeleton width={60} height={24} />
                <LoadingSkeleton width={80} height={24} />
            </div>
        </div>
    );
}

export function ListItemSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3">
            <LoadingSkeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
                <LoadingSkeleton variant="text" width="40%" />
                <LoadingSkeleton variant="text" width="70%" />
            </div>
        </div>
    );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
    return (
        <tr>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="p-3">
                    <LoadingSkeleton variant="text" />
                </td>
            ))}
        </tr>
    );
}
