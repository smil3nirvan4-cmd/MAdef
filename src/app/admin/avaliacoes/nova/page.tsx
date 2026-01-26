'use client';

import { useState } from 'react';

import StepDiscovery, { DiscoveryData } from './steps/StepDiscovery';
import StepPatientInfo, { PatientInfoData } from './steps/StepPatientInfo';
import StepClinical, { ClinicalData } from './steps/StepClinical';
import StepABEMID, { AbemidData } from './steps/StepABEMID';
import StepKatz from './steps/StepKatz';
import StepLawton from './steps/StepLawton';
import StepResponsibilities, { ResponsibilitiesData } from './steps/StepResponsibilities';
import { KATZEvaluation, LawtonEvaluation } from '@/types/evaluation';

export default function NewEvaluationPage() {
    // NAVEGAÇÃO
    const [step, setStep] = useState<'selector' | 'discovery' | 'patient' | 'clinical' | 'abemid' | 'katz' | 'lawton' | 'responsibilities' | 'proposal' | 'hospital'>('selector');

    // STATE GERAL
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [hospitalDetails, setHospitalDetails] = useState({ hospital: '', quarto: '' });
    const [selectedNivel, setSelectedNivel] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // STATES DOS STEPS (EXPANDIDOS)
    const [discoveryData, setDiscoveryData] = useState<DiscoveryData>({
        gatilho: '', gatilhoDescricao: '', urgencia: 'BAIXA', situacaoAtual: '',
        sobrecargaFamiliar: 5, preocupacoes: [], experienciaAnterior: ''
    });

    const [patientData, setPatientData] = useState<PatientInfoData>({
        nome: '', dataNascimento: '', cpf: '', telefone: '',
        sexo: '', peso: '', altura: '', estadoCivil: '', religiao: '', endereco: '',
        profissaoAnterior: '', hobbies: '', temperamento: [],
        rotina: { acorda: '07:00', cafe: '08:00', lancheManha: '', almoco: '12:00', lancheTarde: '', jantar: '19:00', ceia: '', dormir: '21:00' },
        sono: '', preferenciasAlimentares: ''
    });

    const [clinicalData, setClinicalData] = useState<ClinicalData>({
        condicoes: { neurologico: [], cardiovascular: [], respiratorio: [], mobilidade: [], endocrino: [], psiquiatrico: [], gastro: [], outros: '' },
        quedas: 'Nenhuma',
        medicamentos: { total: '1-3', lista: '', alergias: '', restricoes: '' },
        dispositivos: []
    });

    const [abemidData, setAbemidData] = useState<AbemidData>({
        consciencia: '', respiracao: '', alimentacao: '', medicacao: '', pele: '', eliminacoes: '', observacoes: ''
    });

    const [katzData, setKatzData] = useState<KATZEvaluation>({
        banho: 'independente', vestir: 'independente', higiene: 'independente',
        transferencia: 'independente', continencia: 'independente', alimentacao: 'independente'
    });

    const [lawtonData, setLawtonData] = useState<LawtonEvaluation>({
        telefone: 3, compras: 3, cozinhar: 3, tarefasDomesticas: 3,
        lavanderia: 3, transporte: 3, medicacao: 3, financas: 3
    });

    const [responsibilitiesData, setResponsibilitiesData] = useState<ResponsibilitiesData>({
        medicamentos: { separacao: 'Familia', administracao: 'Paciente' },
        insumos: 'Familia',
        alimentacao: 'FamiliaPronta',
        limpeza: 'QuartoBanheiro',
        checklistAmbiente: {
            iluminacaoCorredor: false, iluminacaoQuarto: false, iluminacaoBanheiro: false,
            tapetesSala: false, tapetesQuarto: false, tapetesBanheiro: false,
            barrasBox: false, barrasVaso: false, pisoBox: false,
            degrausEntrada: false, escadasInternas: false, corrimadaoEscada: false,
            espacoCadeira: false, interruptoresAcesso: false, alturaCama: false,
            campainhaEmergencia: false, detectoresFumaca: false, fiosSoltos: false
        },
        observacoes: ''
    });

    // PROPOSAL STATE
    const [orcamentos, setOrcamentos] = useState<any>(null);
    const [loadingOrcamento, setLoadingOrcamento] = useState(false);
    const [proposal, setProposal] = useState({
        valorTotal: 0, entrada: 0, parcelas: 1, valorParcela: 0,
        vencimento: new Date().toISOString().split('T')[0],
        descontos: 0, acrescimos: 0, nome: '', phone: '', email: ''
    });
    const [sending, setSending] = useState(false);

    // ========== LOGIC & HANDLERS ==========

    const handleCalcularOrcamento = async () => {
        setLoadingOrcamento(true);
        try {
            // Lógica Simplificada de Complexidade
            let complexidade: 'BAIXA' | 'MEDIA' | 'ALTA' = 'BAIXA';

            // Critérios de Alta (Exemplos)
            const altaComplexidade =
                abemidData.respiracao === 'Ventilacao' ||
                abemidData.medicacao === 'IV' ||
                abemidData.pele === 'LPP 3' || abemidData.pele === 'LPP 4';

            // Critérios de Média
            const mediaComplexidade =
                !altaComplexidade && (
                    abemidData.consciencia === 'Agressivo' ||
                    abemidData.alimentacao === 'SNE' || abemidData.alimentacao === 'GTT' ||
                    abemidData.medicacao === 'IM' || abemidData.medicacao === 'Subcutanea' ||
                    katzData.transferencia === 'dependente'
                );

            if (altaComplexidade) complexidade = 'ALTA';
            else if (mediaComplexidade) complexidade = 'MEDIA';
            else complexidade = 'BAIXA';

            // Sugestão de Carga Horária baseada na complexidade
            const horasDiarias = complexidade === 'ALTA' ? 24 : 12;

            const res = await fetch('/api/orcamento', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipoProfissional: complexidade === 'ALTA' ? 'TECNICO_ENF' : complexidade === 'MEDIA' ? 'AUXILIAR_ENF' : 'CUIDADOR',
                    complexidade, horasDiarias, duracaoDias: 30, feriados: 2,
                })
            });

            if (res.ok) {
                const data = await res.json();
                setOrcamentos(data.data);
                const parc = data.data.parcelamento;

                setProposal(prev => ({
                    ...prev,
                    valorTotal: data.data.total,
                    entrada: parc?.entrada || 0,
                    parcelas: parc?.quantidadeParcelas || 1,
                    valorParcela: parc?.valorParcela || data.data.total,
                    nome: patientData.nome || selectedPatient?.nome || '',
                    phone: patientData.telefone || selectedPatient?.telefone || '',
                    email: selectedPatient?.email || ''
                }));
                // Advance to Proposal
                setStep('proposal');
            }
        } catch (error) {
            console.error('Erro orçamento', error);
        } finally {
            setLoadingOrcamento(false);
        }
    };

    const handleSendProposal = async () => {
        setSending(true);
        try {
            // CONSTRUIR PAYLOAD COMPLETO (JSON)
            const fullPayload = {
                // Proposal Data
                ...proposal,
                // Full Evaluation Data (JSON)
                dadosDetalhados: {
                    discovery: discoveryData,
                    patient: patientData,
                    clinical: clinicalData,
                    abemid: abemidData,
                    katz: katzData,
                    lawton: lawtonData,
                    responsibilities: responsibilitiesData,
                    orcamento: orcamentos // Snapshot do calculo
                }
            };

            const res = await fetch('/api/propostas/enviar', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullPayload)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert('✅ Proposta enviada e Avaliação Salva com Sucesso!');
                window.location.href = '/admin/avaliacoes';
            } else {
                alert('Erro: ' + data.error);
            }
        } catch (_e) { alert('Erro conexão'); }
        finally { setSending(false); }
    };

    // Reuse Hospital Logic
    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 3) { setSearchResults([]); return; }
        const res = await fetch(`/api/pacientes/search?q=${q}`);
        const data = await res.json();
        setSearchResults(data);
    };
    const selectPatient = (p: any) => {
        setSelectedPatient(p); setSearchQuery(p.nome); setSearchResults([]);
        if (p.hospital) setHospitalDetails(prev => ({ ...prev, hospital: p.hospital }));
    };
    const handleSubmitHospital = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            const res = await fetch('/api/avaliacoes/hospital', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: searchQuery, hospital: hospitalDetails.hospital, quarto: hospitalDetails.quarto, nivel: selectedNivel, phone: selectedPatient?.telefone })
            });
            if (res.ok) { setSuccess(true); setTimeout(() => window.location.href = '/admin/avaliacoes', 2000); }
        } catch (error) { alert('Falha ao acionar plantão.'); } finally { setLoading(false); }
    };

    // ========== RENDER MAPPING ==========

    if (success) {
        return (
            <div className="p-8 text-center mt-20">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-2xl font-bold text-green-600">Plantão Acionado!</h2>
                <p className="text-gray-600 mt-2">Rede notificada. Redirecionando...</p>
            </div>
        );
    }

    if (step === 'selector') return (
        <div className="p-8 max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-8">Nova Avaliação</h1>
            <div className="grid md:grid-cols-2 gap-8 mt-12">
                <button onClick={() => setStep('discovery')} className="group p-8 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 transition-all text-left">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏠</div>
                    <h2 className="text-2xl font-bold mb-2">Avaliação Completa</h2>
                    <p className="text-gray-600">Fluxo Premium (9 Etapas): Social, Clínico, ABEMID, Katz, Lawton e Ambiente. Gera contrato detalhado.</p>
                    <div className="mt-6 text-blue-600 font-bold">Iniciar →</div>
                </button>
                <button onClick={() => setStep('hospital')} className="group p-8 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-green-500 transition-all text-left">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏥</div>
                    <h2 className="text-2xl font-bold mb-2 text-green-800">Hospital Agile</h2>
                    <p className="text-gray-600">Fluxo Expresso para alocação de plantão. Sem burocracia.</p>
                    <div className="mt-6 text-green-600 font-bold">Selecionar →</div>
                </button>
            </div>
            <div className="mt-12 text-center"><a href="/admin/avaliacoes" className="text-gray-500 hover:underline">← Voltar para listagem</a></div>
        </div>
    );

    // 1. DESCOBERTA
    if (step === 'discovery') return <StepDiscovery
        data={discoveryData}
        onUpdate={(d) => setDiscoveryData(p => ({ ...p, ...d }))}
        onNext={() => setStep('patient')}
        onBack={() => setStep('selector')}
    />;

    // 2. DADOS PESSOAIS
    if (step === 'patient') return <StepPatientInfo
        data={patientData}
        onUpdate={(d) => setPatientData(p => ({ ...p, ...d }))}
        onNext={() => setStep('clinical')}
        onBack={() => setStep('discovery')}
    />;

    // 3. CLÍNICO
    if (step === 'clinical') return <StepClinical
        data={clinicalData}
        onUpdate={(d) => setClinicalData(p => ({ ...p, ...d }))}
        onNext={() => setStep('abemid')}
        onBack={() => setStep('patient')}
    />;

    // 4. ABEMID
    if (step === 'abemid') return <StepABEMID
        data={abemidData}
        onUpdate={(d) => setAbemidData(p => ({ ...p, ...d }))}
        onNext={() => setStep('katz')}
        onBack={() => setStep('clinical')}
    />;

    // 5. KATZ
    if (step === 'katz') return <StepKatz
        data={katzData}
        onUpdate={(f, v) => setKatzData(p => ({ ...p, [f]: v }))}
        onNext={() => setStep('lawton')}
        onBack={() => setStep('abemid')}
    />;

    // 5b (6). LAWTON
    if (step === 'lawton') return <StepLawton
        data={lawtonData}
        onUpdate={(f, v) => setLawtonData(p => ({ ...p, [f]: v }))}
        onNext={() => setStep('responsibilities')}
        onBack={() => setStep('katz')}
    />;

    // 6 (7). RESPONSIBILIDADES
    if (step === 'responsibilities') return <StepResponsibilities
        data={responsibilitiesData}
        onUpdate={(d) => setResponsibilitiesData(p => ({ ...p, ...d }))}
        onNext={handleCalcularOrcamento}
        onBack={() => setStep('lawton')}
    />;

    // 7 (8). PROPOSTA
    if (step === 'proposal') return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">✨ Proposta Final de Cuidados</h1>
                        <p className="text-gray-500">Revisão e envio do contrato digital.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500 uppercase font-bold tracking-wider">Investimento Mensal</div>
                        <div className="text-4xl font-black text-green-600">R$ {proposal.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* LEFT COL: Editor */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 border-b pb-4 mb-6 flex items-center gap-2">
                                <span className="text-xl">🛠️</span> Configuração Comercial
                            </h3>

                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Valor Mensal (R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-400">R$</span>
                                        <input
                                            type="number"
                                            value={proposal.valorTotal}
                                            onChange={e => setProposal({ ...proposal, valorTotal: parseFloat(e.target.value) })}
                                            className="w-full border p-3 pl-10 rounded-lg font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Data Vencimento</label>
                                    <input
                                        type="date"
                                        value={proposal.vencimento}
                                        onChange={e => setProposal({ ...proposal, vencimento: e.target.value })}
                                        className="w-full border p-3 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Descontos (R$)</label>
                                    <input
                                        type="number"
                                        value={proposal.descontos}
                                        onChange={e => setProposal({ ...proposal, descontos: parseFloat(e.target.value) })}
                                        className="w-full border p-3 rounded-lg text-gray-600"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Acréscimos (R$)</label>
                                    <input
                                        type="number"
                                        value={proposal.acrescimos}
                                        onChange={e => setProposal({ ...proposal, acrescimos: parseFloat(e.target.value) })}
                                        className="w-full border p-3 rounded-lg text-gray-600"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Forma de Pagamento (Parcelamento)</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 2, 3, 4].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setProposal({ ...proposal, parcelas: p, valorParcela: (proposal.valorTotal - proposal.entrada) / p })}
                                            className={`py-2 rounded border font-medium transition ${proposal.parcelas === p ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                                        >
                                            {p}x Sem Juros
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 border-b pb-4 mb-6 flex items-center gap-2">
                                <span className="text-xl">📝</span> Dados do Contratante
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Nome Responsável</label>
                                    <input
                                        value={proposal.nome}
                                        onChange={e => setProposal({ ...proposal, nome: e.target.value })}
                                        className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp / Email</label>
                                    <input
                                        value={proposal.phone}
                                        onChange={e => setProposal({ ...proposal, phone: e.target.value })}
                                        className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white transition"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: Preview */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-lg">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Resumo do Plano</h3>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                    <span className="text-gray-300">Complexidade</span>
                                    <span className="font-bold bg-white/10 px-2 py-1 rounded text-sm">{orcamentos?.complexidade || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                    <span className="text-gray-300">Carga Horária</span>
                                    <span className="font-bold">{orcamentos?.cargaHoraria || '12h'} / Dia</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                    <span className="text-gray-300">Profissional</span>
                                    <span className="font-bold text-blue-300">{orcamentos?.tipoProfissional || 'Cuidador'}</span>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-lg">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-400">Total Bruto</span>
                                    <span>R$ {proposal.valorTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between mb-2 text-green-400">
                                    <span className="text-sm">Descontos</span>
                                    <span>- R$ {proposal.descontos.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-xl pt-2 border-t border-gray-600 mt-2">
                                    <span>Total Final</span>
                                    <span>R$ {(proposal.valorTotal - proposal.descontos + proposal.acrescimos).toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSendProposal}
                                disabled={sending}
                                className={`mt-8 w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 text-lg transition transform active:scale-95 ${sending ? 'bg-gray-600 cursor-wait' : 'bg-green-500 hover:bg-green-400 text-white'}`}
                            >
                                {sending ? 'Enviando...' : (
                                    <>
                                        🚀 Enviar via WhatsApp
                                    </>
                                )}
                            </button>
                            <div className="text-center mt-4">
                                <button onClick={() => setStep('responsibilities')} className="text-gray-400 text-sm hover:text-white underline">← Voltar para Revisão</button>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-sm text-blue-800">
                            <strong>💡 Dica:</strong> Este valor inclui gestão de escala, substituição em caso de faltas e supervisão técnica semanal de enfermagem.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // HOSPITAL FLOW (Agile)
    if (step === 'hospital') return (
        <div className="p-8 max-w-2xl mx-auto bg-white rounded-2xl shadow mt-8 border-t-8 border-green-500">
            <h1 className="text-2xl font-bold mb-2 text-green-900">Hospital Shift (Urgente)</h1>
            <button onClick={() => setStep('selector')} className="text-sm text-gray-500 mb-6">← Cancelar</button>
            <form className="space-y-6" onSubmit={handleSubmitHospital}>
                <div>
                    <label className="font-bold">Nome do Paciente</label>
                    <input type="text" required value={searchQuery} onChange={e => handleSearch(e.target.value)} className="w-full border p-2 rounded" placeholder="Busca rápida..." />
                    {searchResults.map(p => <div key={p.id} onClick={() => selectPatient(p)} className="p-2 border-b cursor-pointer hover:bg-gray-50">{p.nome} - {p.telefone}</div>)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="font-bold">Hospital</label><input type="text" required value={hospitalDetails.hospital} onChange={e => setHospitalDetails({ ...hospitalDetails, hospital: e.target.value })} className="w-full border p-2 rounded" /></div>
                    <div><label className="font-bold">Quarto</label><input type="text" value={hospitalDetails.quarto} onChange={e => setHospitalDetails({ ...hospitalDetails, quarto: e.target.value })} className="w-full border p-2 rounded" /></div>
                </div>
                <div>
                    <label className="font-bold">Nível Profissional</label>
                    <div className="flex gap-2 mt-2">{['Cuidador', 'Téc. Enfermagem', 'Enfermeiro'].map(n => <button type="button" key={n} onClick={() => setSelectedNivel(n)} className={`p-2 border rounded ${selectedNivel === n ? 'bg-green-600 text-white' : ''}`}>{n}</button>)}</div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded font-bold">{loading ? '...' : 'Acionar Plantão'}</button>
            </form>
        </div>
    );

    return null;
}
