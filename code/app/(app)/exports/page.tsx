'use client';

// ===========================================
// Exports Page
// ===========================================

import { useState, useEffect } from 'react';
import { Download, FileJson, FileText, Loader2, CheckCircle } from 'lucide-react';
import { useAppState } from '@/context/AppContext';
import { apiFetch } from '@/lib/apiFetch';
import { NoRepoEmptyState, NoDataEmptyState, NotTrackedEmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import type { ExportResponse, ApiError } from '@/types/app';

// ─────────────────────────────────────────────
// Export Format Card Component
// ─────────────────────────────────────────────

interface ExportCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    format: 'json' | 'markdown';
    onExport: (format: 'json' | 'markdown') => void;
    isExporting: boolean;
    exported: boolean;
}

function ExportCard({ title, description, icon, format, onExport, isExporting, exported }: ExportCardProps) {
    return (
        <div className="p-6 bg-white border border-base-200 rounded-lg">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-base-100 rounded-lg">
                    {icon}
                </div>
                <div className="flex-1">
                    <h3 className="font-medium text-base-900 mb-1">{title}</h3>
                    <p className="text-sm text-base-600 mb-4">{description}</p>
                    <Button
                        variant="secondary"
                        onClick={() => onExport(format)}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : exported ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        {isExporting ? 'Exporting...' : exported ? 'Downloaded' : 'Download'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Preview Card Component
// ─────────────────────────────────────────────

interface PreviewCardProps {
    data: ExportResponse | null;
}

function PreviewCard({ data }: PreviewCardProps) {
    if (!data) return null;

    return (
        <div className="p-6 bg-white border border-base-200 rounded-lg">
            <h3 className="font-medium text-base-900 mb-4">Export Preview</h3>
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-base-500">Repository</span>
                    <span className="font-mono text-base-900">{data.repo.fullName}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-base-500">Total Decisions</span>
                    <span className="font-mono text-base-900">{data.decisions.length}</span>
                </div>
                {data.decisions.length > 0 && (
                    <>
                        <div className="flex justify-between text-sm">
                            <span className="text-base-500">Tags</span>
                            <span className="font-mono text-base-900">
                                {[...new Set(data.decisions.flatMap(d => d.tags))].length}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-base-500">Date Range</span>
                            <span className="font-mono text-base-900 text-xs">
                                {new Date(data.decisions[data.decisions.length - 1].createdAt).toLocaleDateString()}
                                {' - '}
                                {new Date(data.decisions[0].createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Exports Page Component
// ─────────────────────────────────────────────

export default function ExportsPage() {
    const { selectedRepoId, trackedRepoIds } = useAppState();
    const [previewData, setPreviewData] = useState<ExportResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
    const [exportingFormat, setExportingFormat] = useState<'json' | 'markdown' | null>(null);
    const [exportedFormats, setExportedFormats] = useState<Set<string>>(new Set());

    // Use selected repo or first tracked repo
    const repoId = selectedRepoId || trackedRepoIds[0];

    const fetchPreview = async () => {
        if (!repoId) return;

        setLoading(true);
        setError(null);
        setErrorCode(undefined);

        try {
            const data = await apiFetch<ExportResponse>(`/api/repos/${repoId}/export?format=json`);
            setPreviewData(data);
        } catch (err) {
            const apiErr = err as ApiError;
            setError(apiErr.message || 'An error occurred');
            setErrorCode(apiErr.code);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPreview();
        // Reset exported formats when repo changes
        setExportedFormats(new Set());
    }, [repoId]);

    const handleExport = async (format: 'json' | 'markdown') => {
        if (!repoId) return;

        setExportingFormat(format);

        try {
            const response = await fetch(`/api/repos/${repoId}/export?format=${format}`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to export');
            }

            // Create download
            const contentType = format === 'json' ? 'application/json' : 'text/markdown';
            const extension = format === 'json' ? 'json' : 'md';
            const filename = `decisions-${previewData?.repo.fullName.replace('/', '-')}.${extension}`;

            let blob: Blob;
            if (format === 'json') {
                const data = await response.json();
                blob = new Blob([JSON.stringify(data, null, 2)], { type: contentType });
            } else {
                const text = await response.text();
                blob = new Blob([text], { type: contentType });
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setExportedFormats(prev => new Set(prev).add(format));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to export');
        } finally {
            setExportingFormat(null);
        }
    };

    // No repo selected
    if (!repoId) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Data Exports</h1>
                    <p className="text-base-500 mt-1">
                        Generate reports and data dumps for compliance
                    </p>
                </div>
                <NoRepoEmptyState onConnect={() => window.location.href = '/setup'} />
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Data Exports</h1>
                    <p className="text-base-500 mt-1">Loading export data...</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <LoadingSkeleton className="h-40" />
                    <LoadingSkeleton className="h-40" />
                    <LoadingSkeleton className="h-40" />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        if (errorCode === 'NOT_FOUND') {
            return (
                <div className="p-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-base-900">Data Exports</h1>
                    </div>
                    <NotTrackedEmptyState onEnable={() => window.location.href = `/setup?repo=${repoId}`} />
                </div>
            );
        }

        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Data Exports</h1>
                </div>
                <ErrorState
                    title="Failed to load export data"
                    message={error}
                    errorCode={errorCode}
                    onRetry={fetchPreview}
                />
            </div>
        );
    }

    // No decisions
    if (previewData && previewData.decisions.length === 0) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Data Exports</h1>
                    <p className="text-base-500 mt-1">
                        Generate reports and data dumps for compliance
                    </p>
                </div>
                <NoDataEmptyState />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-base-900">Data Exports</h1>
                <p className="text-base-500 mt-1">
                    Generate reports and data dumps for compliance
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Export Options */}
                <div className="lg:col-span-2 space-y-4">
                    <ExportCard
                        title="JSON Export"
                        description="Machine-readable format with full decision data. Ideal for integrations and data analysis."
                        icon={<FileJson className="w-6 h-6 text-base-600" />}
                        format="json"
                        onExport={handleExport}
                        isExporting={exportingFormat === 'json'}
                        exported={exportedFormats.has('json')}
                    />
                    <ExportCard
                        title="Markdown Export"
                        description="Human-readable format structured as an ADR (Architectural Decision Record) document."
                        icon={<FileText className="w-6 h-6 text-base-600" />}
                        format="markdown"
                        onExport={handleExport}
                        isExporting={exportingFormat === 'markdown'}
                        exported={exportedFormats.has('markdown')}
                    />
                </div>

                {/* Preview */}
                <div>
                    <PreviewCard data={previewData} />
                </div>
            </div>
        </div>
    );
}
