import Link from 'next/link';

export default function AdminDashboard() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Painel Administrativo - Mãos Amigas</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link href="/admin/candidatos" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition">
                    <h2 className="text-xl font-semibold mb-2">📢 Candidatos & RH</h2>
                    <p className="text-gray-600">Aprovar cuidadores reprovados na triagem ou aguardando entrevista.</p>
                </Link>

                <Link href="/admin/avaliacoes" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition">
                    <h2 className="text-xl font-semibold mb-2">🏥 Avaliações de Pacientes</h2>
                    <p className="text-gray-600">Validar urgências, calcular orçamentos e definir planos.</p>
                </Link>


                <div className="p-6 bg-white rounded-lg shadow opacity-75">
                    <h2 className="text-xl font-semibold mb-2">📊 Escalas & Alocação</h2>
                    <p className="text-gray-600">Gestão de slots e monitoramento de plantões (Em breve).</p>
                </div>
            </div>
        </div>
    );
}
