import { getFormSubmissions } from '@/lib/database';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

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
        <div className="p-6 lg:p-8 space-y-4">
            <PageHeader
                title="Submissoes de Formularios"
                description="Formularios recebidos via site e WhatsApp."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Formularios' },
                ]}
            />

            <Card noPadding>
                {submissions.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Nenhum formulário recebido ainda.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {submissions.map((sub: any) => {
                            let parsedData: FormDados = {};
                            try {
                                parsedData = typeof sub.dados === 'string' ? JSON.parse(sub.dados) : sub.dados;
                            } catch (_e) {
                                parsedData = { error: 'Erro ao ler dados' };
                            }

                            return (
                                <div key={sub.id} className="p-6 hover:bg-background transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <Badge variant="info">{sub.tipo}</Badge>
                                            <h3 className="text-lg font-medium text-foreground mt-1">
                                                {parsedData.nome || 'Sem nome'}
                                            </h3>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {new Date(sub.createdAt).toLocaleString('pt-BR')}
                                        </span>
                                    </div>

                                    <div className="mt-2 text-sm text-foreground">
                                        <p><strong>Telefone:</strong> {sub.telefone || parsedData.telefone || 'N/A'}</p>
                                        <div className="mt-2 bg-background p-3 rounded text-xs font-mono overflow-x-auto">
                                            {JSON.stringify(parsedData, null, 2)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}
