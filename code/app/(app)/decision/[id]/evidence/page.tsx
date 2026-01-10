import Link from "next/link";
import EvidencePanel from "@/components/Evidence/EvidencePanel";

export default async function EvidencePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <div className="flex flex-col h-screen">
            <div className="h-14 border-b border-base-200 flex items-center px-6 justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <Link href={`/decision/${id}`} className="text-sm text-base-500 hover:text-base-900 font-medium">
                        ← Back to Decision #{id}
                    </Link>
                    <div className="h-4 w-px bg-base-200"></div>
                    <div className="font-semibold text-base-900">Evidence Review</div>
                </div>
            </div>
            <EvidencePanel decisionId={id} />
        </div>
    );
}
