
interface PlaceholderProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description = "This view is currently under development." }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 h-[calc(100vh-64px)] text-center opacity-60">
      <div className="w-16 h-16 border-2 border-base-200 border-dashed rounded-lg mb-4 flex items-center justify-center bg-base-50">
        <span className="text-2xl text-base-300">🚧</span>
      </div>
      <h1 className="text-lg font-medium text-base-900 mb-1">{title}</h1>
      <p className="text-sm text-base-500 font-mono">{description}</p>
    </div>
  );
}
