import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Field } from '@/components/ui/Field';
import { Search } from 'lucide-react';

export default function StyleguidePage() {
    return (
        <div className="p-8 space-y-12 pb-24 max-w-5xl mx-auto">
            <div className="space-y-2">
                <h1 className="text-h1">UI Styleguide (Enterprise B2B)</h1>
                <p className="text-muted-foreground">Repositório de componentes refatorados para o novo padrão visual.</p>
            </div>

            <SectionCard title="Typography" description="Escala tipográfica baseada em Inter.">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-h1">Heading 1 (24px Semibold)</h1>
                        <p className="text-caption mt-1">Titulos de página principais.</p>
                    </div>
                    <div>
                        <h2 className="text-h2">Heading 2 (18px Semibold)</h2>
                        <p className="text-caption mt-1">Seções principais dentro de páginas.</p>
                    </div>
                    <div>
                        <h3 className="text-h3">Heading 3 (14px Semibold)</h3>
                        <p className="text-caption mt-1">Títulos de cards e subsecções.</p>
                    </div>
                    <div>
                        <p className="text-body">Body Normal (14px). Usado para descrever a maioria do conteúdo, blocos de texto e parágrafos normais.</p>
                    </div>
                    <div>
                        <label className="text-label">Label (13px Medium)</label>
                        <p className="text-caption mt-1">Descrições sutis, ajudas e hints.</p>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Buttons" description="Estados e variantes de botões.">
                <div className="flex flex-wrap gap-4 items-end">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="danger">Danger</Button>
                    <Button variant="success">Success</Button>
                </div>
                <div className="flex flex-wrap gap-4 items-end mt-4">
                    <Button variant="primary" disabled>Disabled</Button>
                    <Button variant="primary" isLoading>Loading</Button>
                    <Button variant="primary" size="sm">Small</Button>
                    <Button variant="primary" size="lg">Large</Button>
                </div>
            </SectionCard>

            <SectionCard title="Inputs & Fields" description="Formulários e controles de entrada.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Nome Completo" required hint="Digite o nome completo do paciente.">
                        <Input placeholder="Ex: João da Silva" />
                    </Field>

                    <Field label="Busca" hint="Input com ícone.">
                        <Input icon={Search} placeholder="Buscar..." />
                    </Field>

                    <Field label="Email" required error="Email inválido.">
                        <Input defaultValue="joao@erro" error="Email inválido." />
                    </Field>

                    <Field label="Desativado">
                        <Input disabled value="Não pode editar" />
                    </Field>
                </div>
            </SectionCard>

            <SectionCard title="Badges" description="Rótulos de status.">
                <div className="flex flex-wrap gap-3">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="error">Error</Badge>
                    <Badge variant="info">Info</Badge>
                    <Badge variant="purple">Purple</Badge>
                    <Badge variant="whatsapp">WhatsApp</Badge>
                </div>
            </SectionCard>

            <SectionCard title="Cards" description="Containers e superfícies.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="text-h3 mb-2">Card Simples</h3>
                        <p className="text-muted-foreground text-sm">Um card básico com padding padronizado e bordas enterprise.</p>
                    </Card>
                    <SectionCard title="Card de Seção" description="Com toolbar e header separado." noPadding>
                        <div className="p-4 bg-surface-subtle border-b border-border text-sm">
                            Área de highlight sutil.
                        </div>
                        <div className="p-4 text-sm">
                            Conteúdo principal.
                        </div>
                    </SectionCard>
                </div>
            </SectionCard>
        </div>
    );
}
