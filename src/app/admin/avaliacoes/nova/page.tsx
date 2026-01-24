'use client';

import { useState } from 'react';

export default function NewEvaluationPage() {
    const [step, setStep] = useState<'selector' | 'homecare' | 'hospital'>('selector');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [hospitalDetails, setHospitalDetails] = useState({ hospital: '', quarto: '' });
    const [selectedNivel, setSelectedNivel] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 3) {
            setSearchResults([]);
            return;
        }

        // Simples debounce
        const res = await fetch(`/api/pacientes/search?q=${q}`);
        const data = await res.json();
        setSearchResults(data);
    };

    const selectPatient = (p: any) => {
        setSelectedPatient(p);
        setSearchQuery(p.nome);
        setSearchResults([]);
        // Pre-fill hospital if it exists in lead data
        if (p.hospital) setHospitalDetails(prev => ({ ...prev, hospital: p.hospital }));
    };

    const handleSubmitHospital = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/avaliacoes/hospital', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: searchQuery,
                    hospital: hospitalDetails.hospital,
                    quarto: hospitalDetails.quarto,
                    nivel: selectedNivel,
                    phone: selectedPatient?.telefone
                })
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => window.location.href = '/admin/avaliacoes', 2000);
            }
        } catch (error) {
            console.error('Erro ao enviar:', error);
            alert('Falha ao acionar plantão.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="p-8 text-center mt-20">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-2xl font-bold text-green-600">Plantão Acionado!</h2>
                <p className="text-gray-600 mt-2">Rede de cuidadores notificada. Redirecionando...</p>
            </div>
        );
    }

    if (step === 'selector') {


        return (
            <div className="p-8 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-center">Nova Avaliação</h1>

                <div className="grid md:grid-cols-2 gap-8 mt-12">
                    {/* Opção 1: Home Care */}
                    <button
                        onClick={() => setStep('homecare')}
                        className="group p-8 bg-white border-2 border-transparent hover:border-blue-500 rounded-2xl shadow-lg transition-all text-left"
                    >
                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏠</div>
                        <h2 className="text-2xl font-bold mb-2">Cuidado Domiciliar (Idoso)</h2>
                        <p className="text-gray-600 text-sm">
                            Fluxo completo com anamnese, escalas ABEMID/KATZ e geração de orçamento em 3 cenários. Ideal para casos planejados.
                        </p>
                        <div className="mt-6 flex items-center text-blue-600 font-bold text-sm">
                            Selecionar Fluxo Domiciliar →
                        </div>
                    </button>

                    {/* Opção 2: Plantão Hospitalar */}
                    <button
                        onClick={() => setStep('hospital')}
                        className="group p-8 bg-white border-2 border-transparent hover:border-green-500 rounded-2xl shadow-lg transition-all text-left"
                    >
                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏥</div>
                        <h2 className="text-2xl font-bold mb-2 text-green-800">Plantão Hospitalar (Agile)</h2>
                        <p className="text-gray-600 text-sm">
                            Fluxo simplificado para urgências em hospitais. Foco em alocação imediata de Técnico/Enfermeiro sem escalas iniciais.
                        </p>
                        <div className="mt-6 flex items-center text-green-600 font-bold text-sm">
                            Selecionar Fluxo Ágil (Hospital) →
                        </div>
                    </button>
                </div>

                <div className="mt-12 text-center">
                    <a href="/admin/avaliacoes" className="text-gray-500 hover:underline">← Voltar para listagem</a>
                </div>
            </div>
        );
    }

    if (step === 'hospital') {
        return (
            <div className="p-8 max-w-2xl mx-auto bg-white rounded-2xl shadow mt-8 border-t-8 border-green-500">
                <h1 className="text-2xl font-bold mb-2 text-green-900">Hospital Shift (Urgente)</h1>
                <p className="text-sm text-gray-500 mb-8 italic">Preencha apenas o essencial para a primeira alocação.</p>

                <form className="space-y-6" onSubmit={handleSubmitHospital}>
                    <div className="relative">
                        <label className="block text-sm font-bold text-gray-700">Nome do Paciente</label>
                        <input
                            type="text"
                            required
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 border"
                            placeholder="Nome Completo ou Telefone"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                                {searchResults.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => selectPatient(p)}
                                        className="w-full text-left p-2 hover:bg-blue-50 border-b last:border-0"
                                    >
                                        <div className="font-bold text-sm">{p.nome}</div>
                                        <div className="text-xs text-gray-500">{p.telefone} - {p.cidade}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedPatient && (
                            <div className="mt-2 p-2 bg-blue-50 text-blue-700 text-xs rounded flex justify-between items-center">
                                <span>✨ Paciente encontrado no sistema (Lead)</span>
                                <button type="button" onClick={() => setSelectedPatient(null)} className="underline">Limpar</button>
                            </div>
                        )}
                    </div>


                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700">Hospital</label>
                            <input
                                type="text"
                                required
                                value={hospitalDetails.hospital}
                                onChange={(e) => setHospitalDetails(prev => ({ ...prev, hospital: e.target.value }))}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 border"
                                placeholder="Nome do Hospital"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700">Setor/Quarto</label>
                            <input
                                type="text"
                                value={hospitalDetails.quarto}
                                onChange={(e) => setHospitalDetails(prev => ({ ...prev, quarto: e.target.value }))}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 border"
                                placeholder="Ex: UTI 301"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700">Nível do Profissional Solicitado</label>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                            {['Cuidador', 'Téc. Enfermagem', 'Enfermeiro'].map((nivel) => (
                                <button
                                    key={nivel}
                                    type="button"
                                    onClick={() => setSelectedNivel(nivel)}
                                    className={`p-3 border rounded-lg text-sm transition ${selectedNivel === nivel ? 'bg-green-600 text-white border-green-600' : 'hover:bg-green-50 hover:border-green-500'}`}
                                >
                                    {nivel}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 border-t flex justify-between">
                        <button type="button" onClick={() => setStep('selector')} className="text-gray-500">Voltar</button>
                        <button
                            type="submit"
                            disabled={loading || !selectedNivel || !searchQuery}
                            className={`bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                        >
                            {loading ? 'Processando...' : '🚀 Acionar Alocação Imediata'}
                        </button>
                    </div>
                </form>

            </div>
        );
    }

    return (
        <div className="p-8 text-center text-gray-500">
            Fluxo Domiciliar Completo será integrado em seguida.
            <br />
            <button onClick={() => setStep('selector')} className="mt-4 text-blue-600 underline">Voltar</button>
        </div>
    );
}
