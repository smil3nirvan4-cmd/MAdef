import { test, expect } from '@playwright/test';

test.describe.serial('Fluxo: Cuidador -> Alocacao', () => {
    const uniquePhone = `5521${Date.now().toString().slice(-8)}`;
    let cuidadorId: string;
    let alocacaoId: string;

    test('criar cuidador via API', async ({ request }) => {
        const response = await request.post('/api/admin/candidatos', {
            data: {
                nome: 'E2E Cuidador Teste',
                telefone: uniquePhone,
                area: 'ENFERMAGEM',
                endereco: 'Rua Teste 123, RJ',
                competencias: 'Home care, idosos',
            },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.cuidador.id).toBeDefined();
        cuidadorId = body.cuidador.id;
    });

    test('listar candidatos inclui o recem criado', async ({ request }) => {
        const response = await request.get(`/api/admin/candidatos?search=${uniquePhone}&status=ALL`);
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        const found = body.cuidadores.find((c: any) => c.telefone === uniquePhone);
        expect(found).toBeDefined();
        expect(found.nome).toBe('E2E Cuidador Teste');
    });

    test('criar alocacao para o cuidador', async ({ request }) => {
        const response = await request.post('/api/admin/alocacoes', {
            data: {
                cuidadorId,
                slotId: `e2e-slot-${Date.now()}`,
                turno: 'DIURNO',
                diaSemana: 1,
                dataInicio: new Date().toISOString(),
                hospital: 'Hospital E2E Teste',
                quarto: '101',
            },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.alocacao.id).toBeDefined();
        expect(body.alocacao.cuidadorId).toBe(cuidadorId);
        alocacaoId = body.alocacao.id;
    });

    test('listar alocacoes inclui a recem criada', async ({ request }) => {
        const response = await request.get(`/api/admin/alocacoes?cuidadorId=${cuidadorId}`);
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        const found = body.alocacoes.find((a: any) => a.id === alocacaoId);
        expect(found).toBeDefined();
        expect(found.status).toBe('PENDENTE_FEEDBACK');
    });
});
