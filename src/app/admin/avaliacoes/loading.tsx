export default function Loading() {
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="h-4 w-48 bg-blue-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 w-64 bg-blue-100 rounded animate-pulse"></div>
            </div>

            <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
                            </div>
                            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="mt-4 pt-4 border-t flex gap-4">
                            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
                            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
