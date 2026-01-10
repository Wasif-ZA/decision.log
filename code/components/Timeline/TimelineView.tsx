import TimelineItem from "./TimelineItem";
import { Decision } from "@/types";

const MOCK_Decisions: Decision[] = [
    {
        id: "14",
        type: "decision",
        title: "Introduce caching layer",
        commit: "a83f2c1",
        confidence: 0.82,
        files: ["auth/middleware.ts", "cache/redis.ts"],
        date: "A moment ago",
    },
    {
        id: "pr-214",
        type: "decision",
        title: "Refactor auth flow to support OAuth",
        commit: "PR #214",
        confidence: 0.95,
        files: ["auth/oauth.ts", "auth/provider.ts"],
        date: "2 hours ago",
    },
    {
        id: "ignored-1",
        type: "ignored",
        title: "Update README.md",
        commit: "f92ab11",
        confidence: 0.1,
        files: ["README.md"],
        date: "5 hours ago",
    },
    {
        id: "12",
        type: "decision",
        title: "Migrate to Tailwind CSS v4",
        commit: "b71a9d2",
        confidence: 0.88,
        files: ["app/globals.css", "package.json"],
        date: "Yesterday",
    },
];

export default function TimelineView() {
    return (
        <div className="max-w-4xl mx-auto w-full p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-base-200">
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-base-100 border border-base-200 rounded text-sm font-medium text-base-700">
                        Repo: <span className="text-base-900">api-service</span>
                    </div>
                    <div className="px-3 py-1 bg-base-100 border border-base-200 rounded text-sm font-medium text-base-700">
                        Branch: <span className="text-base-900">main</span>
                    </div>
                </div>
                <div className="text-sm text-base-500">Last 24 Hours</div>
            </div>

            {/* List */}
            <div className="flex flex-col relative pl-2">
                {MOCK_Decisions.map((decision, index) => (
                    <TimelineItem
                        key={decision.id}
                        decision={decision}
                        isLast={index === MOCK_Decisions.length - 1}
                    />
                ))}
            </div>
        </div>
    );
}
