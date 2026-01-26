import { getFormSubmissions } from '@/lib/database';

// Tipagem para os dados parseados (pode variar)
interface FormDados {
    nome?: string;
    telefone?: string;
    email?: string;
    [key: string]: any;
}

export default async function FormulariosPage() {
    const submissions = await getFormSubmissions();

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">📝 Submissões de Formulários</h1>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {submissions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Nenhum formulário recebido ainda.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {submissions.map((sub: any) => {
                            let parsedData: FormDados = {};
                            try {
                                parsedData = typeof sub.dados === 'string' ? JSON.parse(sub.dados) : sub.dados;
                            } catch (_e) {
                                parsedData = { error: 'Erro ao ler dados' };
                            }

                            return (
                                <div key={sub.id} className="p-6 hover:bg-gray-50 transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {sub.tipo}
                                            </span>
                                            <h3 className="text-lg font-medium text-gray-900 mt-1">
                                                {parsedData.nome || 'Sem nome'}
                                            </h3>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {new Date(sub.createdAt).toLocaleString('pt-BR')}
                                        </span>
                                    </div>

                                    <div className="mt-2 text-sm text-gray-600">
                                        <p><strong>Telefone:</strong> {sub.telefone || parsedData.telefone || 'N/A'}</p>
                                        <div className="mt-2 bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
                                            {JSON.stringify(parsedData, null, 2)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
