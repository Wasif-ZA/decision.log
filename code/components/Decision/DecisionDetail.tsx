"use client";

import { useState } from "react";
import Link from "next/link";

// Mock Data for a specific decision
const MOCK_DETAIL = {
    id: "14",
    title: "Introduce caching layer",
    confidence: 0.82,
    verified: true,
    context: [
        "Auth latency exceeded SLA under load (avg 400ms > 200ms)",
        "Spike during peak traffic window (09:00 UTC)",
    ],
    decision: [
        "Added Redis-based cache in auth middleware",
        "Cache TTL set to 5 minutes to balance freshness/perf",
    ],
    alternatives: [
        {
            title: "Vertical scaling",
            status: "Rejected",
            reason: "Cost prohibitive ($400/mo extra)",
        },
        {
            title: "Query optimization",
            status: "Insufficient",
            reason: "Database CPU was not the bottleneck",
        },
    ],
    constraints: ["SLA breach requires immediate fix", "Time pressure: Incident response"],
    evidence: [
        { type: "Commit", id: "a83f2c1", desc: "Implementation" },
        { type: "PR", id: "#214", desc: "Code Review" },
        { type: "Snapshot", id: "diff-1", desc: "Request Latency Drop" },
    ],
};

interface SectionProps {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

function Section({ title, defaultOpen = true, children }: SectionProps) {
    return (
        <details className="group border border-base-200 rounded-md mb-4 bg-white open:pb-4" open={defaultOpen}>
            <summary className="px-4 py-3 cursor-pointer font-medium text-base-900 select-none flex items-center justify-between group-hover:bg-base-50 rounded-t-md transition-colors">
                {title}
                <span className="text-base-400 text-sm group-open:rotate-180 transition-transform">
                    ▼
                </span>
            </summary>
            <div className="px-4 pt-2 text-base-700 text-sm leading-relaxed border-t border-base-100 mt-1">
                {children}
            </div>
        </details>
    );
}

export default function DecisionDetail() {
    const data = MOCK_DETAIL;

    return (
        <div className="max-w-4xl mx-auto w-full p-8">
            {/* Back Link */}
            <Link href="/" className="text-xs font-mono text-base-500 hover:text-base-900 mb-6 block">
                ← Back to Timeline
            </Link>

            {/* Header */}
            <div className="mb-8 border-b border-base-200 pb-6">
                <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-xs text-base-500">Decision #{data.id}</span>
                    {data.verified && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full flex items-center gap-1 border border-green-200">
                            Verified ✔
                        </span>
                    )}
                </div>
                <h1 className="text-2xl font-semibold text-base-900 mb-2">{data.title}</h1>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-32 bg-base-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${data.confidence > 0.8 ? "bg-green-500" : "bg-amber-500"
                                }`}
                            style={{ width: `${data.confidence * 100}%` }}
                        />
                    </div>
                    <span className="text-sm font-medium text-base-600">
                        Confidence: {data.confidence}
                    </span>
                </div>
            </div>

            {/* Core Logic */}
            <div className="space-y-2">
                <Section title="Context">
                    <ul className="list-disc list-inside space-y-1">
                        {data.context.map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                </Section>

                <Section title="Decision">
                    <ul className="list-disc list-inside space-y-1">
                        {data.decision.map((line, i) => (
                            <li key={i} className="font-medium text-base-900">
                                {line}
                            </li>
                        ))}
                    </ul>
                </Section>

                <Section title="Alternatives Considered">
                    <div className="space-y-3">
                        {data.alternatives.map((alt, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                                <span className="font-medium text-base-800">{alt.title}</span>
                                <span className="text-base-400 hidden sm:inline">—</span>
                                <span className="text-base-600">
                                    <span className="text-xs font-mono bg-base-100 px-1.5 py-0.5 rounded text-base-500 mr-2">
                                        {alt.status}
                                    </span>
                                    {alt.reason}
                                </span>
                            </div>
                        ))}
                    </div>
                </Section>

                <Section title="Constraints">
                    <ul className="list-disc list-inside space-y-1">
                        {data.constraints.map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                </Section>

                <Section title="Evidence" defaultOpen={true}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {data.evidence.map((ev, i) => (
                            <Link
                                href={`/decision/${data.id}/evidence`}
                                key={i}
                                className="p-3 border border-base-200 rounded bg-base-50 hover:border-accent-300 hover:bg-accent-50 transition-colors cursor-pointer group block"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-mono text-base-500 uppercase tracking-wider">
                                        {ev.type}
                                    </span>
                                    <span className="text-base-400 group-hover:text-accent-600">↗</span>
                                </div>
                                <div className="font-mono text-sm font-medium text-base-900 mb-1">
                                    {ev.id}
                                </div>
                                <div className="text-xs text-base-600 truncate">{ev.desc}</div>
                            </Link>
                        ))}
                    </div>
                </Section>
            </div>
        </div>
    );
}
