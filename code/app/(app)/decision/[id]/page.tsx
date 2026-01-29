import DecisionDetail from "@/components/Decision/DecisionDetail";

export default async function DecisionPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <DecisionDetail decisionId={id} />;
}
