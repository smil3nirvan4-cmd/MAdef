export default function Loading() {
    return (
        <div className="p-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow border">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 w-full bg-gray-100 rounded animate-pulse"></div>
                        <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border">
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex gap-2">
                                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
                                <div className="h-4 w-full bg-gray-100 rounded animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
