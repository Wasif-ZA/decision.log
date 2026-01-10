interface EvidencePanelProps {
    decisionId: string;
}

export default function EvidencePanel({ decisionId }: EvidencePanelProps) {
    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden border-t border-base-200">
            {/* Left Panel: Summary */}
            <div className="w-1/3 min-w-[300px] border-r border-base-200 bg-base-50 p-6 overflow-y-auto">
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-base-900 uppercase tracking-wider mb-4">
                        Decision Summary
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <div className="text-xs text-base-500 mb-1">Decision</div>
                            <div className="text-sm text-base-900 font-medium">Add Redis Caching</div>
                        </div>
                        <div>
                            <div className="text-xs text-base-500 mb-1">Constraint</div>
                            <div className="text-sm text-base-900">SLA Breach</div>
                        </div>
                        <div>
                            <div className="text-xs text-base-500 mb-1">Confidence</div>
                            <div className="text-sm text-green-700 font-mono">0.82 (High)</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white border border-base-200 rounded shadow-sm">
                    <div className="text-xs font-medium text-base-400 mb-2 uppercase">AI Reasoning</div>
                    <p className="text-sm text-base-600 leading-relaxed">
                        The change introduces a caching layer to address latency.
                        Code analysis confirms <code className="bg-base-100 px-1 rounded">redis.set</code> usage
                        matches the decision intent.
                    </p>
                </div>
            </div>

            {/* Right Panel: Diff View */}
            <div className="flex-1 bg-white overflow-y-auto font-mono text-sm relative">
                <div className="sticky top-0 bg-base-100 border-b border-base-200 px-4 py-2 text-xs text-base-500 flex justify-between">
                    <span>auth/middleware.ts</span>
                    <span>View on GitHub ↗</span>
                </div>

                <div className="p-4">
                    {/* Mock Diff */}
                    <div className="space-y-1">
                        <div className="text-base-400 select-none">  ...</div>
                        <div className="flex bg-red-50 text-red-900 opacity-50">
                            <span className="w-8 text-center select-none text-red-300 border-r border-red-100 mr-3">34</span>
                            <span>- const user = await db.getUser(token);</span>
                        </div>
                        <div className="flex bg-green-50 text-green-900">
                            <span className="w-8 text-center select-none text-green-300 border-r border-green-100 mr-3">34</span>
                            <span>{"+ const user = await cache.get(`user:${token}`);"}</span>
                        </div>
                        <div className="flex bg-green-50 text-green-900">
                            <span className="w-8 text-center select-none text-green-300 border-r border-green-100 mr-3">35</span>
                            <span>{"+ if (!user) {"}</span>
                        </div>
                        <div className="flex bg-green-50 text-green-900">
                            <span className="w-8 text-center select-none text-green-300 border-r border-green-100 mr-3">36</span>
                            <span>{"+   const user = await db.getUser(token);"}</span>
                        </div>
                        <div className="flex bg-green-50 text-green-900">
                            <span className="w-8 text-center select-none text-green-300 border-r border-green-100 mr-3">37</span>
                            <span>{"+   await cache.set(`user:${token}`, user, { ttl: 300 });"}</span>
                        </div>
                        <div className="flex bg-green-50 text-green-900">
                            <span className="w-8 text-center select-none text-green-300 border-r border-green-100 mr-3">38</span>
                            <span>{"+ }"}</span>
                        </div>
                        <div className="text-base-400 select-none">  ...</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
