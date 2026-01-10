// ===========================================
// Badge Component
// ===========================================

type BadgeVariant =
    | 'default'
    | 'verified'
    | 'partial'
    | 'unverified'
    | 'reverted'
    | 'pending'
    | 'success'
    | 'warning'
    | 'error'
    | 'info';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-base-100 text-base-700 border-base-200',
    verified: 'bg-green-50 text-green-700 border-green-200',
    partial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    unverified: 'bg-red-50 text-red-700 border-red-200',
    reverted: 'bg-purple-50 text-purple-700 border-purple-200',
    pending: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
        ${variantStyles[variant]}
        ${className}
      `}
        >
            {children}
        </span>
    );
}

// ===========================================
// Decision Status Badges
// ===========================================

export function VerifiedBadge() {
    return <Badge variant="verified">✅ Verified</Badge>;
}

export function PartialBadge() {
    return <Badge variant="partial">🟡 Partial</Badge>;
}

export function UnverifiedBadge() {
    return <Badge variant="unverified">🔴 Unverified</Badge>;
}

export function RevertedBadge() {
    return <Badge variant="reverted">♻️ Reverted</Badge>;
}

export function PendingBadge() {
    return <Badge variant="pending">⏳ Pending</Badge>;
}

// ===========================================
// Confidence Badge
// ===========================================

interface ConfidenceBadgeProps {
    confidence: number; // 0-100
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
    let variant: BadgeVariant = 'default';

    if (confidence >= 80) {
        variant = 'success';
    } else if (confidence >= 50) {
        variant = 'warning';
    } else {
        variant = 'error';
    }

    return (
        <Badge variant={variant}>
            {confidence}%
        </Badge>
    );
}

// ===========================================
// Type Badges
// ===========================================

export function CommitBadge() {
    return <Badge variant="default">Commit</Badge>;
}

export function PullRequestBadge() {
    return <Badge variant="info">PR</Badge>;
}

export function ReleaseBadge() {
    return <Badge variant="success">Release</Badge>;
}
