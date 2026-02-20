export default function Loading() {
    return (
        <div className="p-8">
            <div className="h-8 w-48 bg-neutral-200 rounded-md animate-pulse mb-6"></div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <div className="h-6 w-32 bg-neutral-200 rounded-md animate-pulse mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 w-full bg-surface-subtle rounded animate-pulse"></div>
                        <div className="h-4 w-3/4 bg-surface-subtle rounded animate-pulse"></div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <div className="h-6 w-40 bg-neutral-200 rounded-md animate-pulse mb-4"></div>
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex gap-2">
                                <div className="h-4 w-24 bg-surface-subtle rounded animate-pulse"></div>
                                <div className="h-4 w-full bg-surface-subtle rounded animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
