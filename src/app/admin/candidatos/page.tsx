import { getCuidadoresAguardandoRH } from '@/lib/database';

export const dynamic = 'force-dynamic';

export default async function CandidatosPage() {
    const cuidadores = await getCuidadoresAguardandoRH();

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Gestão de Candidatos (RH)</h1>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <p className="font-medium">Fluxo Implementado via WhatsApp:</p>
                <ul className="list-disc ml-5 mt-2 text-sm text-gray-700">
                    <li>Candidato faz Quiz no ZAP</li>
                    <li>Aprovados aparecem aqui com status <strong>AGUARDANDO_RH</strong></li>
                    <li>RH entrevista e aprova manualmente</li>
                </ul>
            </div>

            <div className="border rounded-lg bg-white overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome/Tel</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {cuidadores.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    Nenhum candidato aguardando aprovação no momento.
                                </td>
                            </tr>
                        ) : (
                            cuidadores.map((c: any) => (
                                <tr key={c.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{c.telefone}</div>
                                        <div className="text-sm text-gray-500">{c.nome || 'Nome pendente'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {c.area || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {c.quizScore ? `${c.quizScore}%` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button className="text-indigo-600 hover:text-indigo-900 mr-4">Entrevistar</button>
                                        <button className="text-green-600 hover:text-green-900">Aprovar</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
