/**
 * OpenAPI 3.0 specification for the MAdef API.
 *
 * Exports a plain JavaScript object — no YAML parsing required.
 * Helper functions at the bottom reduce repetition across path definitions.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Standard bearer + session-cookie security requirement for protected routes. */
function protectedSecurity() {
    return [{ bearerAuth: [] }, { sessionCookie: [] }];
}

/** Ref shorthand: `$ref("#/components/schemas/<name>")` */
function ref(schema: string) {
    return { $ref: `#/components/schemas/${schema}` };
}

/** Wraps a data schema inside the standard SuccessResponse envelope. */
function successEnvelope(dataSchema: Record<string, unknown>) {
    return {
        type: 'object' as const,
        properties: {
            success: { type: 'boolean', example: true },
            data: dataSchema,
            meta: ref('ApiMeta'),
        },
        required: ['success', 'data', 'meta'],
    };
}

/** Creates a standard 200-OK JSON response referencing a given schema. */
function jsonResponse(description: string, schema: Record<string, unknown>) {
    return {
        description,
        content: { 'application/json': { schema } },
    };
}

/** Common error responses reused across all protected endpoints. */
function protectedErrors() {
    return {
        '401': jsonResponse('Unauthorized', ref('ErrorResponse')),
        '403': jsonResponse('Forbidden', ref('ErrorResponse')),
        '500': jsonResponse('Internal server error', ref('ErrorResponse')),
    };
}

/** Path parameter helper. */
function pathParam(name: string, description: string) {
    return {
        name,
        in: 'path' as const,
        required: true,
        schema: { type: 'string' as const },
        description,
    };
}

/** Query parameter helper. */
function queryParam(name: string, description: string, opts?: { type?: string; required?: boolean; example?: unknown }) {
    return {
        name,
        in: 'query' as const,
        required: opts?.required ?? false,
        schema: { type: (opts?.type ?? 'string') as string },
        description,
        ...(opts?.example !== undefined ? { example: opts.example } : {}),
    };
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

function buildSchemas() {
    return {
        ApiMeta: {
            type: 'object',
            properties: {
                requestId: { type: 'string', format: 'uuid' },
                timestamp: { type: 'string', format: 'date-time' },
                durationMs: { type: 'number', nullable: true },
            },
            required: ['requestId', 'timestamp'],
        },

        SuccessResponse: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'object' },
                meta: ref('ApiMeta'),
            },
            required: ['success', 'data', 'meta'],
        },

        ErrorResponse: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: false },
                error: {
                    type: 'object',
                    properties: {
                        code: { type: 'string', example: 'NOT_FOUND' },
                        message: { type: 'string' },
                        field: { type: 'string', nullable: true },
                        details: { nullable: true },
                    },
                    required: ['code', 'message'],
                },
                meta: ref('ApiMeta'),
            },
            required: ['success', 'error', 'meta'],
        },

        PaginatedResponse: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'array', items: { type: 'object' } },
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
                    required: ['page', 'pageSize', 'total', 'totalPages', 'hasNext', 'hasPrev'],
                },
                meta: ref('ApiMeta'),
            },
            required: ['success', 'data', 'pagination', 'meta'],
        },

        Paciente: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                telefone: { type: 'string' },
                nome: { type: 'string', nullable: true },
                cidade: { type: 'string', nullable: true },
                bairro: { type: 'string', nullable: true },
                tipo: { type: 'string', enum: ['HOME_CARE', 'HOSPITAL'], default: 'HOME_CARE' },
                hospital: { type: 'string', nullable: true },
                quarto: { type: 'string', nullable: true },
                status: { type: 'string', enum: ['LEAD', 'AVALIACAO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO', 'ATIVO', 'INATIVO'] },
                prioridade: { type: 'string', enum: ['NORMAL', 'ALTA', 'URGENTE'], default: 'NORMAL' },
                gqpScore: { type: 'integer', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'telefone', 'status', 'tipo', 'prioridade'],
        },

        Cuidador: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                telefone: { type: 'string' },
                nome: { type: 'string', nullable: true },
                area: { type: 'string', nullable: true },
                status: { type: 'string', enum: ['CRIADO', 'AGUARDANDO_RH', 'APROVADO', 'REPROVADO'] },
                quizScore: { type: 'integer', nullable: true },
                scoreRH: { type: 'integer', nullable: true },
                competencias: { type: 'string', nullable: true },
                endereco: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'telefone', 'status'],
        },

        Avaliacao: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                pacienteId: { type: 'string' },
                abemidScore: { type: 'integer', nullable: true },
                katzScore: { type: 'integer', nullable: true },
                lawtonScore: { type: 'integer', nullable: true },
                gqp: { type: 'integer', nullable: true },
                nivelSugerido: { type: 'string', nullable: true },
                cargaSugerida: { type: 'string', nullable: true },
                nivelFinal: { type: 'string', nullable: true },
                cargaFinal: { type: 'string', nullable: true },
                status: { type: 'string', enum: ['PENDENTE', 'CONCLUIDA', 'VALIDADA'] },
                createdAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'pacienteId', 'status'],
        },

        Orcamento: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                pacienteId: { type: 'string' },
                avaliacaoId: { type: 'string', nullable: true },
                valorFinal: { type: 'number', nullable: true },
                moeda: { type: 'string', default: 'BRL' },
                status: { type: 'string', enum: ['RASCUNHO', 'ENVIADO', 'ACEITO', 'RECUSADO'] },
                cenarioEconomico: { type: 'string', nullable: true },
                cenarioRecomendado: { type: 'string', nullable: true },
                cenarioPremium: { type: 'string', nullable: true },
                cenarioSelecionado: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'pacienteId', 'status'],
        },

        Alocacao: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                cuidadorId: { type: 'string' },
                pacienteId: { type: 'string', nullable: true },
                slotId: { type: 'string' },
                turno: { type: 'string' },
                diaSemana: { type: 'integer', minimum: 0, maximum: 6 },
                dataInicio: { type: 'string', format: 'date-time' },
                hospital: { type: 'string', nullable: true },
                quarto: { type: 'string', nullable: true },
                status: { type: 'string', enum: ['PENDENTE_FEEDBACK', 'ACEITA', 'RECUSADA', 'CANCELADA'] },
                createdAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'cuidadorId', 'slotId', 'turno', 'diaSemana', 'status'],
        },

        ConsentRecord: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                pacienteId: { type: 'string' },
                purpose: { type: 'string' },
                granted: { type: 'boolean' },
                grantedAt: { type: 'string', format: 'date-time', nullable: true },
                revokedAt: { type: 'string', format: 'date-time', nullable: true },
                ipAddress: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'pacienteId', 'purpose', 'granted'],
        },

        DashboardStats: {
            type: 'object',
            properties: {
                totalLeads: { type: 'integer' },
                leadsNovos: { type: 'integer' },
                totalCandidatos: { type: 'integer' },
                candidatosAprovados: { type: 'integer' },
                candidatosPendentes: { type: 'integer' },
                totalPacientes: { type: 'integer' },
                pacientesAtivos: { type: 'integer' },
                totalAvaliacoes: { type: 'integer' },
                avaliacoesPendentes: { type: 'integer' },
                totalOrcamentos: { type: 'integer' },
                mensagensHoje: { type: 'integer' },
                mensagensSemana: { type: 'integer' },
                conversasAtivas: { type: 'integer' },
            },
        },

        HealthStatus: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                timestamp: { type: 'string', format: 'date-time' },
                uptime: { type: 'number' },
                version: { type: 'string' },
                dbSchemaOk: { type: 'boolean' },
                databaseProvider: { type: 'string' },
                databaseTarget: { type: 'string' },
                checks: {
                    type: 'object',
                    properties: {
                        database: { type: 'object', properties: { status: { type: 'string' }, latency: { type: 'number' } } },
                        redis: { type: 'object', properties: { status: { type: 'string' }, latency: { type: 'number' } } },
                        fileSystem: { type: 'object', properties: { status: { type: 'string' } } },
                        whatsapp: { type: 'object', properties: { status: { type: 'string' }, connected: { type: 'boolean' } } },
                        memory: { type: 'object', properties: { used: { type: 'number' }, total: { type: 'number' }, percentage: { type: 'number' } } },
                    },
                },
            },
            required: ['status', 'timestamp', 'uptime', 'version'],
        },
    };
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function buildPaths() {
    return {
        // ---- Health -------------------------------------------------------
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'Health check',
                description: 'Returns system health status including database, Redis, WhatsApp bridge, and memory checks.',
                operationId: 'getHealth',
                responses: {
                    '200': jsonResponse('System is healthy or degraded', ref('HealthStatus')),
                    '503': jsonResponse('System is unhealthy', ref('HealthStatus')),
                },
            },
        },

        // ---- Dashboard ----------------------------------------------------
        '/admin/dashboard/stats': {
            get: {
                tags: ['Admin'],
                summary: 'Get dashboard statistics',
                description: 'Returns aggregate counts for leads, patients, candidates, evaluations, budgets, and messages.',
                operationId: 'getDashboardStats',
                security: protectedSecurity(),
                responses: {
                    '200': jsonResponse('Dashboard statistics', successEnvelope(ref('DashboardStats'))),
                    ...protectedErrors(),
                },
            },
        },

        // ---- Pacientes ----------------------------------------------------
        '/admin/pacientes': {
            get: {
                tags: ['Pacientes'],
                summary: 'List patients',
                description: 'Returns a paginated list of patients with optional search and filter parameters.',
                operationId: 'listPacientes',
                security: protectedSecurity(),
                parameters: [
                    queryParam('page', 'Page number', { type: 'integer', example: 1 }),
                    queryParam('pageSize', 'Items per page', { type: 'integer', example: 20 }),
                    queryParam('search', 'Search by name, phone, city or neighborhood'),
                    queryParam('status', 'Filter by status (LEAD, ATIVO, AVALIACAO, etc.)'),
                    queryParam('tipo', 'Filter by type (HOME_CARE, HOSPITAL)'),
                    queryParam('cidade', 'Filter by city'),
                    queryParam('sort', 'Sort field (createdAt, nome, status, cidade)'),
                    queryParam('direction', 'Sort direction (asc, desc)'),
                ],
                responses: {
                    '200': jsonResponse('Paginated list of patients', ref('PaginatedResponse')),
                    ...protectedErrors(),
                },
            },
        },

        '/admin/pacientes/{id}': {
            get: {
                tags: ['Pacientes'],
                summary: 'Get patient by ID',
                description: 'Returns a single patient with related counts (evaluations, budgets, allocations, messages).',
                operationId: 'getPaciente',
                security: protectedSecurity(),
                parameters: [pathParam('id', 'Patient ID')],
                responses: {
                    '200': jsonResponse('Patient details', successEnvelope(ref('Paciente'))),
                    '404': jsonResponse('Patient not found', ref('ErrorResponse')),
                    ...protectedErrors(),
                },
            },
            patch: {
                tags: ['Pacientes'],
                summary: 'Update patient',
                description: 'Partially updates a patient record.',
                operationId: 'updatePaciente',
                security: protectedSecurity(),
                parameters: [pathParam('id', 'Patient ID')],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    nome: { type: 'string' },
                                    cidade: { type: 'string' },
                                    bairro: { type: 'string' },
                                    tipo: { type: 'string' },
                                    hospital: { type: 'string' },
                                    quarto: { type: 'string' },
                                    status: { type: 'string' },
                                    prioridade: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': jsonResponse('Updated patient', successEnvelope(ref('Paciente'))),
                    '404': jsonResponse('Patient not found', ref('ErrorResponse')),
                    ...protectedErrors(),
                },
            },
        },

        // ---- Candidatos (Cuidadores) --------------------------------------
        '/admin/candidatos': {
            get: {
                tags: ['Cuidadores'],
                summary: 'List caregiver candidates',
                description: 'Returns caregiver candidates with optional status, area, and search filters.',
                operationId: 'listCandidatos',
                security: protectedSecurity(),
                parameters: [
                    queryParam('status', 'Filter by status (CRIADO, AGUARDANDO_RH, APROVADO, REPROVADO)'),
                    queryParam('area', 'Filter by area'),
                    queryParam('search', 'Search by name or phone'),
                ],
                responses: {
                    '200': jsonResponse('List of candidates with stats', successEnvelope({
                        type: 'object',
                        properties: {
                            cuidadores: { type: 'array', items: ref('Cuidador') },
                            stats: { type: 'object' },
                        },
                    })),
                    ...protectedErrors(),
                },
            },
            post: {
                tags: ['Cuidadores'],
                summary: 'Create caregiver candidate',
                description: 'Registers a new caregiver candidate. Phone number must be unique.',
                operationId: 'createCandidato',
                security: protectedSecurity(),
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    nome: { type: 'string' },
                                    telefone: { type: 'string' },
                                    area: { type: 'string' },
                                    endereco: { type: 'string' },
                                    competencias: { type: 'string' },
                                },
                                required: ['telefone'],
                            },
                        },
                    },
                },
                responses: {
                    '201': jsonResponse('Created candidate', successEnvelope(ref('Cuidador'))),
                    '400': jsonResponse('Validation error', ref('ErrorResponse')),
                    ...protectedErrors(),
                },
            },
        },

        '/admin/candidatos/{id}': {
            get: {
                tags: ['Cuidadores'],
                summary: 'Get candidate by ID',
                description: 'Returns a single caregiver candidate by their ID.',
                operationId: 'getCandidato',
                security: protectedSecurity(),
                parameters: [pathParam('id', 'Candidate ID')],
                responses: {
                    '200': jsonResponse('Candidate details', successEnvelope(ref('Cuidador'))),
                    '404': jsonResponse('Candidate not found', ref('ErrorResponse')),
                    ...protectedErrors(),
                },
            },
        },

        // ---- Avaliacoes ---------------------------------------------------
        '/admin/avaliacoes/{id}': {
            get: {
                tags: ['Avaliacoes'],
                summary: 'Get evaluation',
                description: 'Returns a clinical evaluation by ID, including ABEMID, Katz, and Lawton scores.',
                operationId: 'getAvaliacao',
                security: protectedSecurity(),
                parameters: [pathParam('id', 'Evaluation ID')],
                responses: {
                    '200': jsonResponse('Evaluation details', successEnvelope(ref('Avaliacao'))),
                    '404': jsonResponse('Evaluation not found', ref('ErrorResponse')),
                    ...protectedErrors(),
                },
            },
        },

        // ---- Orcamentos ---------------------------------------------------
        '/admin/orcamentos/{id}': {
            get: {
                tags: ['Orcamentos'],
                summary: 'Get budget',
                description: 'Returns a budget/proposal by ID with pricing scenarios.',
                operationId: 'getOrcamento',
                security: protectedSecurity(),
                parameters: [pathParam('id', 'Budget ID')],
                responses: {
                    '200': jsonResponse('Budget details', successEnvelope(ref('Orcamento'))),
                    '404': jsonResponse('Budget not found', ref('ErrorResponse')),
                    ...protectedErrors(),
                },
            },
        },

        // ---- Alocacoes ----------------------------------------------------
        '/admin/alocacoes': {
            get: {
                tags: ['Alocacoes'],
                summary: 'List allocations',
                description: 'Returns caregiver allocations with optional status, caregiver, and patient filters.',
                operationId: 'listAlocacoes',
                security: protectedSecurity(),
                parameters: [
                    queryParam('status', 'Filter by status (PENDENTE_FEEDBACK, ACEITA, RECUSADA, CANCELADA)'),
                    queryParam('cuidadorId', 'Filter by caregiver ID'),
                    queryParam('pacienteId', 'Filter by patient ID'),
                ],
                responses: {
                    '200': jsonResponse('List of allocations with stats', successEnvelope({
                        type: 'object',
                        properties: {
                            alocacoes: { type: 'array', items: ref('Alocacao') },
                            stats: { type: 'object' },
                        },
                    })),
                    ...protectedErrors(),
                },
            },
            post: {
                tags: ['Alocacoes'],
                summary: 'Create allocation',
                description: 'Creates a new caregiver-to-patient allocation for a specific shift and day.',
                operationId: 'createAlocacao',
                security: protectedSecurity(),
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    cuidadorId: { type: 'string' },
                                    slotId: { type: 'string' },
                                    pacienteId: { type: 'string' },
                                    turno: { type: 'string' },
                                    diaSemana: { type: 'integer', minimum: 0, maximum: 6 },
                                    dataInicio: { type: 'string', format: 'date-time' },
                                    hospital: { type: 'string' },
                                    quarto: { type: 'string' },
                                },
                                required: ['cuidadorId', 'slotId'],
                            },
                        },
                    },
                },
                responses: {
                    '201': jsonResponse('Created allocation', successEnvelope(ref('Alocacao'))),
                    '400': jsonResponse('Validation error', ref('ErrorResponse')),
                    ...protectedErrors(),
                },
            },
        },

        // ---- LGPD ---------------------------------------------------------
        '/admin/lgpd/export/{pacienteId}': {
            get: {
                tags: ['LGPD'],
                summary: 'Export patient data (LGPD)',
                description: 'Exports all personal data associated with a patient, as required by LGPD data portability rights.',
                operationId: 'exportPacienteData',
                security: protectedSecurity(),
                parameters: [pathParam('pacienteId', 'Patient ID')],
                responses: {
                    '200': jsonResponse('Exported patient data', successEnvelope({ type: 'object' })),
                    '404': jsonResponse('Patient not found', ref('ErrorResponse')),
                    ...protectedErrors(),
                },
            },
        },

        '/admin/lgpd/anonymize/{pacienteId}': {
            post: {
                tags: ['LGPD'],
                summary: 'Anonymize patient (LGPD)',
                description: 'Anonymizes all personal data for a patient, as required by LGPD right to erasure.',
                operationId: 'anonymizePaciente',
                security: protectedSecurity(),
                parameters: [pathParam('pacienteId', 'Patient ID')],
                responses: {
                    '200': jsonResponse('Patient anonymized', successEnvelope({
                        type: 'object',
                        properties: { anonymized: { type: 'boolean', example: true } },
                    })),
                    '404': jsonResponse('Patient not found', ref('ErrorResponse')),
                    ...protectedErrors(),
                },
            },
        },

        '/admin/lgpd/consent/{pacienteId}': {
            get: {
                tags: ['LGPD'],
                summary: 'List consent records',
                description: 'Returns all consent records for a patient.',
                operationId: 'listConsents',
                security: protectedSecurity(),
                parameters: [pathParam('pacienteId', 'Patient ID')],
                responses: {
                    '200': jsonResponse('List of consent records', successEnvelope({
                        type: 'array',
                        items: ref('ConsentRecord'),
                    })),
                    ...protectedErrors(),
                },
            },
            post: {
                tags: ['LGPD'],
                summary: 'Grant or revoke consent',
                description: 'Grants or revokes consent for a specific purpose for the given patient.',
                operationId: 'manageConsent',
                security: protectedSecurity(),
                parameters: [pathParam('pacienteId', 'Patient ID')],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    purpose: { type: 'string', description: 'Consent purpose identifier' },
                                    action: { type: 'string', enum: ['grant', 'revoke'] },
                                },
                                required: ['purpose', 'action'],
                            },
                        },
                    },
                },
                responses: {
                    '200': jsonResponse('Consent revoked', successEnvelope(ref('ConsentRecord'))),
                    '201': jsonResponse('Consent granted', successEnvelope(ref('ConsentRecord'))),
                    '404': jsonResponse('Active consent not found (revoke only)', ref('ErrorResponse')),
                    ...protectedErrors(),
                },
            },
        },
    };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function getOpenAPISpec() {
    return {
        openapi: '3.0.0',
        info: {
            title: 'MAdef API',
            version: '1.0.0',
            description: 'API para gerenciamento de cuidadores domiciliares \u2014 M\u00e3os Amigas',
        },
        servers: [{ url: '/api' }],
        tags: [
            { name: 'Admin', description: 'Administrative dashboard endpoints' },
            { name: 'Pacientes', description: 'Patient management' },
            { name: 'Cuidadores', description: 'Caregiver candidate management' },
            { name: 'Avaliacoes', description: 'Clinical evaluations (ABEMID, Katz, Lawton)' },
            { name: 'Orcamentos', description: 'Budgets and pricing proposals' },
            { name: 'Alocacoes', description: 'Caregiver-to-patient allocations' },
            { name: 'WhatsApp', description: 'WhatsApp messaging integration' },
            { name: 'LGPD', description: 'Data privacy (Lei Geral de Prote\u00e7\u00e3o de Dados)' },
            { name: 'Health', description: 'System health checks' },
        ],
        paths: buildPaths(),
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    description: 'JWT bearer token obtained via NextAuth',
                },
                sessionCookie: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'next-auth.session-token',
                    description: 'NextAuth session cookie (set automatically by the browser)',
                },
            },
            schemas: buildSchemas(),
        },
    };
}
