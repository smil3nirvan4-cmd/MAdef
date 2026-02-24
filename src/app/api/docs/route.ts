import { NextResponse } from 'next/server';

const spec = {
    openapi: '3.1.0',
    info: {
        title: 'MAdef — Home Care Platform API',
        version: '0.1.0',
        description: 'API para plataforma de home care MAdef. Inclui gestão de pacientes, cuidadores, avaliações, orçamentos, alocações e integração WhatsApp.',
        contact: { name: 'MAdef Team' },
        license: { name: 'Proprietary' },
    },
    servers: [
        { url: '/', description: 'Current environment' },
    ],
    tags: [
        { name: 'Health', description: 'System health checks' },
        { name: 'Auth', description: 'Authentication' },
        { name: 'Pacientes', description: 'Patient management' },
        { name: 'Avaliacoes', description: 'Clinical evaluations' },
        { name: 'Orcamentos', description: 'Budget/pricing management' },
        { name: 'Alocacoes', description: 'Caregiver allocations' },
        { name: 'Candidatos', description: 'HR candidate management' },
        { name: 'WhatsApp', description: 'WhatsApp integration' },
        { name: 'LGPD', description: 'Data privacy compliance' },
        { name: 'Logs', description: 'System logging' },
    ],
    paths: {
        '/api/health': {
            get: {
                tags: ['Health'],
                summary: 'System health check',
                operationId: 'getHealth',
                responses: {
                    '200': { description: 'Healthy or degraded', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthStatus' } } } },
                    '503': { description: 'Unhealthy' },
                },
            },
        },
        '/api/admin/auth/me': {
            get: {
                tags: ['Auth'],
                summary: 'Get current user session and capabilities',
                operationId: 'getMe',
                security: [{ session: [] }],
                responses: {
                    '200': { description: 'Current user info', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
        },
        '/api/admin/pacientes': {
            get: {
                tags: ['Pacientes'],
                summary: 'List patients (paginated)',
                operationId: 'listPacientes',
                security: [{ session: [] }],
                parameters: [
                    { $ref: '#/components/parameters/page' },
                    { $ref: '#/components/parameters/pageSize' },
                    { name: 'search', in: 'query', schema: { type: 'string' } },
                    { name: 'status', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    '200': { description: 'Paginated patient list', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
            post: {
                tags: ['Pacientes'],
                summary: 'Create a patient',
                operationId: 'createPaciente',
                security: [{ session: [] }],
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PacienteInput' } } } },
                responses: {
                    '201': { description: 'Patient created' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                },
            },
        },
        '/api/admin/pacientes/{id}': {
            get: {
                tags: ['Pacientes'],
                summary: 'Get patient by ID',
                operationId: 'getPaciente',
                security: [{ session: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { '200': { description: 'Patient detail' }, '404': { $ref: '#/components/responses/NotFound' } },
            },
            patch: {
                tags: ['Pacientes'],
                summary: 'Update patient',
                operationId: 'updatePaciente',
                security: [{ session: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PacienteInput' } } } },
                responses: { '200': { description: 'Patient updated' } },
            },
        },
        '/api/admin/avaliacoes': {
            get: {
                tags: ['Avaliacoes'],
                summary: 'List evaluations (paginated)',
                operationId: 'listAvaliacoes',
                security: [{ session: [] }],
                parameters: [{ $ref: '#/components/parameters/page' }, { $ref: '#/components/parameters/pageSize' }],
                responses: { '200': { description: 'Paginated evaluation list' } },
            },
            post: {
                tags: ['Avaliacoes'],
                summary: 'Create an evaluation',
                operationId: 'createAvaliacao',
                security: [{ session: [] }],
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
                responses: { '201': { description: 'Evaluation created' } },
            },
        },
        '/api/admin/avaliacoes/{id}': {
            get: { tags: ['Avaliacoes'], summary: 'Get evaluation by ID', operationId: 'getAvaliacao', security: [{ session: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Evaluation detail' } } },
            patch: { tags: ['Avaliacoes'], summary: 'Update evaluation', operationId: 'updateAvaliacao', security: [{ session: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated' } } },
            delete: { tags: ['Avaliacoes'], summary: 'Soft-delete evaluation', operationId: 'deleteAvaliacao', security: [{ session: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Deleted' } } },
        },
        '/api/admin/orcamentos': {
            get: { tags: ['Orcamentos'], summary: 'List budgets (paginated)', operationId: 'listOrcamentos', security: [{ session: [] }], parameters: [{ $ref: '#/components/parameters/page' }, { $ref: '#/components/parameters/pageSize' }], responses: { '200': { description: 'Budget list' } } },
            post: { tags: ['Orcamentos'], summary: 'Create budget', operationId: 'createOrcamento', security: [{ session: [] }], responses: { '201': { description: 'Created' } } },
        },
        '/api/admin/alocacoes': {
            get: { tags: ['Alocacoes'], summary: 'List allocations', operationId: 'listAlocacoes', security: [{ session: [] }], responses: { '200': { description: 'Allocation list' } } },
            post: { tags: ['Alocacoes'], summary: 'Create allocation', operationId: 'createAlocacao', security: [{ session: [] }], responses: { '201': { description: 'Created' } } },
        },
        '/api/admin/candidatos': {
            get: { tags: ['Candidatos'], summary: 'List HR candidates', operationId: 'listCandidatos', security: [{ session: [] }], responses: { '200': { description: 'Candidate list' } } },
            post: { tags: ['Candidatos'], summary: 'Create candidate', operationId: 'createCandidato', security: [{ session: [] }], responses: { '201': { description: 'Created' } } },
        },
        '/api/admin/whatsapp/contacts': {
            get: { tags: ['WhatsApp'], summary: 'List WhatsApp contacts', operationId: 'listContacts', security: [{ session: [] }], responses: { '200': { description: 'Contact list' } } },
        },
        '/api/admin/whatsapp/queue': {
            get: { tags: ['WhatsApp'], summary: 'List WhatsApp outbox queue', operationId: 'listQueue', security: [{ session: [] }], responses: { '200': { description: 'Queue items' } } },
        },
        '/api/admin/whatsapp/analytics': {
            get: { tags: ['WhatsApp'], summary: 'WhatsApp usage analytics', operationId: 'getAnalytics', security: [{ session: [] }], responses: { '200': { description: 'Analytics data' } } },
        },
        '/api/admin/lgpd': {
            get: {
                tags: ['LGPD'],
                summary: 'Get consent history or export personal data',
                operationId: 'getLgpd',
                security: [{ session: [] }],
                parameters: [
                    { name: 'phone', in: 'query', required: true, schema: { type: 'string' } },
                    { name: 'action', in: 'query', schema: { type: 'string', enum: ['history', 'consents', 'export'] } },
                ],
                responses: { '200': { description: 'LGPD data' } },
            },
            post: {
                tags: ['LGPD'],
                summary: 'Record consent, export, or anonymize data',
                operationId: 'postLgpd',
                security: [{ session: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['action'],
                                properties: {
                                    action: { type: 'string', enum: ['consent', 'export', 'anonymize'] },
                                    phone: { type: 'string' },
                                    tipo: { type: 'string', enum: ['TERMS', 'MARKETING', 'DATA_PROCESSING', 'PROFILING'] },
                                    consentido: { type: 'boolean' },
                                },
                            },
                        },
                    },
                },
                responses: { '200': { description: 'Action completed' }, '201': { description: 'Consent recorded' } },
            },
        },
        '/api/admin/logs': {
            get: { tags: ['Logs'], summary: 'List system logs', operationId: 'listLogs', security: [{ session: [] }], responses: { '200': { description: 'Log entries' } } },
        },
        '/api/whatsapp/webhook': {
            post: { tags: ['WhatsApp'], summary: 'WhatsApp webhook receiver', operationId: 'webhookPost', responses: { '200': { description: 'Acknowledged' } } },
        },
    },
    components: {
        securitySchemes: {
            session: { type: 'apiKey', in: 'cookie', name: 'authjs.session-token', description: 'NextAuth session cookie' },
        },
        parameters: {
            page: { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
            pageSize: { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
        },
        schemas: {
            HealthStatus: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number' },
                    version: { type: 'string' },
                    checks: { type: 'object' },
                },
            },
            ApiSuccess: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', const: true },
                    data: {},
                    meta: { $ref: '#/components/schemas/ApiMeta' },
                },
            },
            ApiError: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', const: false },
                    error: {
                        type: 'object',
                        properties: {
                            code: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                    meta: { $ref: '#/components/schemas/ApiMeta' },
                },
            },
            ApiMeta: {
                type: 'object',
                properties: {
                    requestId: { type: 'string', format: 'uuid' },
                    durationMs: { type: 'number' },
                    timestamp: { type: 'string', format: 'date-time' },
                },
            },
            PaginatedResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array' },
                    pagination: {
                        type: 'object',
                        properties: {
                            page: { type: 'integer' },
                            pageSize: { type: 'integer' },
                            total: { type: 'integer' },
                            totalPages: { type: 'integer' },
                            hasNext: { type: 'boolean' },
                            hasPrev: { type: 'boolean' },
                        },
                    },
                    meta: { $ref: '#/components/schemas/ApiMeta' },
                },
            },
            PacienteInput: {
                type: 'object',
                properties: {
                    telefone: { type: 'string' },
                    nome: { type: 'string' },
                    cidade: { type: 'string' },
                    bairro: { type: 'string' },
                    tipo: { type: 'string', enum: ['HOME_CARE', 'HOSPITAL'] },
                    hospital: { type: 'string' },
                    quarto: { type: 'string' },
                    prioridade: { type: 'string', enum: ['NORMAL', 'ALTA', 'URGENTE'] },
                },
                required: ['telefone'],
            },
        },
        responses: {
            Unauthorized: { description: 'Not authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
            Forbidden: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
            NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
            ValidationError: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
    },
};

export async function GET() {
    return NextResponse.json(spec, {
        headers: {
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
