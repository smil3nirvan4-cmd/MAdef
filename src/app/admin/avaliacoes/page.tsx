import Link from 'next/link';
import { getAvaliacoesPendentes } from '@/lib/database';

export default async function AvaliacoesPage() {
    const avaliacoes = await getAvaliacoesPendentes();

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Avaliações & Orçamentos (Paciente)</h1>
                <Link
                    href="/admin/avaliacoes/nova"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition flex items-center gap-2"
                >
                    ➕ Novo Paciente / Plantão
                </Link>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <p className="font-medium">Novos Recursos Ativos:</p>
                <ul className="list-disc ml-5 mt-2 text-sm text-gray-700">
                    <li>Triagem de Urgência (Bloqueio 192)</li>
                    <li>Detecção de palavras-chave (Prioridade)</li>
                </ul>
            </div>

            <div className="grid gap-4">
                {avaliacoes.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-lg border border-dashed text-gray-500">
                        Nenhuma avaliação pendente no momento.
                    </div>
                ) : (
                    avaliacoes.map((av: any) => (
                        <div key={av.id} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-gray-900">{av.paciente?.nome || 'Paciente sem nome'}</h3>
                                        {av.paciente?.prioridade === 'ALTA' && (
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">PRIORIDADE ALTA</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">Tel: {av.paciente?.telefone}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                        {av.paciente?.tipo === 'HOSPITAL' ? 'Alocação Ágil' : 'Avaliar Agora'}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t flex gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Status:</span>
                                    <span className="font-medium ml-1 text-blue-600">{av.status}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Nível Sugerido:</span>
                                    <span className="font-medium ml-1">{av.nivelSugerido || 'A calcular'}</span>
                                </div>
                                <div className="ml-auto text-gray-400 text-xs">
                                    Recebida em: {new Date(av.createdAt).toLocaleString('pt-BR')}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
