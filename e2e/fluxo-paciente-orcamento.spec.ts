import { test, expect } from '@playwright/test';

test.describe.serial('Fluxo: Paciente -> Orcamento', () => {
    const uniquePhone = `5511${Date.now().toString().slice(-8)}`;
    let pacienteId: string;
    let orcamentoId: string;

    test('criar paciente via API', async ({ request }) => {
        const response = await request.post('/api/admin/pacientes', {
            data: {
                nome: 'E2E Paciente Teste',
                telefone: uniquePhone,
                cidade: 'Sao Paulo',
                bairro: 'Vila Mariana',
                tipo: 'HOME_CARE',
                prioridade: 'NORMAL',
            },
        });

        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.data.paciente.id).toBeDefined();
        expect(body.data.paciente.telefone).toBe(uniquePhone);
        pacienteId = body.data.paciente.id;
    });

    test('listar pacientes inclui o recem criado', async ({ request }) => {
        const response = await request.get(`/api/admin/pacientes?search=${uniquePhone}`);
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.data.length).toBeGreaterThanOrEqual(1);
        const found = body.data.find((p: any) => p.telefone === uniquePhone);
        expect(found).toBeDefined();
    });

    test('criar orcamento para o paciente', async ({ request }) => {
        const response = await request.post('/api/admin/orcamentos', {
            data: {
                pacienteId,
                cenarioSelecionado: 'recomendado',
                valorFinal: 5000,
                status: 'RASCUNHO',
            },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.data.id || body.orcamento?.id).toBeDefined();
        orcamentoId = body.data?.id || body.orcamento?.id;
    });

    test('listar orcamentos inclui o recem criado', async ({ request }) => {
        const response = await request.get('/api/admin/orcamentos');
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        const list = body.data || body.orcamentos || [];
        const found = list.find((o: any) => o.id === orcamentoId);
        expect(found).toBeDefined();
        expect(found.pacienteId).toBe(pacienteId);
    });
});
