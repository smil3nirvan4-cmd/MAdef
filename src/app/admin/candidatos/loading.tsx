export default function Loading() {
    return (
        <div className="p-8">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6"></div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="h-4 w-48 bg-yellow-200 rounded animate-pulse mb-2"></div>
                <div className="space-y-1">
                    <div className="h-3 w-56 bg-yellow-100 rounded animate-pulse"></div>
                    <div className="h-3 w-64 bg-yellow-100 rounded animate-pulse"></div>
                </div>
            </div>

            <div className="border rounded-lg bg-white overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                            </th>
                            <th className="px-6 py-3 text-left">
                                <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                            </th>
                            <th className="px-6 py-3 text-left">
                                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                            </th>
                            <th className="px-6 py-3 text-left">
                                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {[1, 2, 3, 4].map((i) => (
                            <tr key={i}>
                                <td className="px-6 py-4">
                                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
                                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse"></div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="h-5 w-20 bg-blue-100 rounded-full animate-pulse"></div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                                        <div className="h-4 w-14 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
