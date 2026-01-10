import Link from "next/link";
import { Decision } from "@/types";

interface TimelineItemProps {
    decision: Decision;
    isLast?: boolean;
}

export default function TimelineItem({ decision, isLast }: TimelineItemProps) {
    const isIgnored = decision.type === "ignored";

    return (
        <div className="flex gap-4 group">
            {/* Timeline Connector */}
            <div className="flex flex-col items-center">
                <div
                    className={`
            w-3 h-3 rounded-full border-2 z-10 box-border
            ${isIgnored
                            ? "border-base-300 bg-white"
                            : "border-base-900 bg-base-900"
                        }
          `}
                />
                {!isLast && (
                    <div className="w-px bg-base-200 flex-1 my-1 group-last:hidden" />
                )}
            </div>

            {/* Content */}
            <div className={`pb-8 flex-1 ${isIgnored ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs text-base-500 bg-base-100 px-1.5 py-0.5 rounded">
                        {decision.commit}
                    </span>
                    <span className="text-sm text-base-400">{decision.date}</span>
                </div>

                <h3 className="text-base font-medium text-base-900 mb-1">
                    {decision.title}
                </h3>

                {!isIgnored && (
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-4 text-sm">
                            <span
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border
                  ${decision.confidence > 0.8
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-amber-50 text-amber-900 border-amber-200"
                                    }
                `}
                            >
                                Confidence: {decision.confidence}
                            </span>
                        </div>

                        <div className="text-sm text-base-500 font-mono">
                            Files: {decision.files.join(", ")}
                        </div>

                        <div className="mt-1">
                            <Link
                                href={`/decision/${decision.id}`}
                                className="text-sm font-medium text-accent-700 hover:text-accent-800 flex items-center gap-1 group/link"
                            >
                                View decision
                                <span className="group-hover/link:translate-x-0.5 transition-transform">
                                    →
                                </span>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
