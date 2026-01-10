// ===========================================
// Timeline Page (Main Landing)
// ===========================================

import { NoDataEmptyState } from '@/components/ui/EmptyState';

export default function TimelinePage() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-base-900">Timeline</h1>
                <p className="text-base-500 mt-1">
                    View your repository events and extracted decisions
                </p>
            </div>

            {/* Placeholder - will be replaced with actual timeline */}
            <NoDataEmptyState />
        </div>
    );
}
