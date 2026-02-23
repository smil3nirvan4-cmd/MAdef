import { NextResponse } from 'next/server';

const OPENAPI_SPEC = {
    openapi: '3.1.0',
    info: {
        title: 'MAdef (Mãos Amigas) API',
        version: '1.0.0',
        description: 'Home care management platform API for managing caregivers, patients, evaluations, pricing, and WhatsApp communication.',
        contact: { name: 'MAdef Team' },
    },
    servers: [
        { url: process.env.APP_URL || 'http://localhost:3000', description: 'Application server' },
    ],
    tags: [
        { name: 'health', description: 'Health and metrics' },
        { name: 'auth', description: 'Authentication' },
        { name: 'pacientes', description: 'Patient management' },
        { name: 'cuidadores', description: 'Caregiver/candidate management' },
        { name: 'avaliacoes', description: 'Clinical evaluations (ABEMID/Katz/Lawton)' },
        { name: 'orcamentos', description: 'Pricing and budgets' },
        { name: 'alocacoes', description: 'Caregiver-patient allocations' },
        { name: 'whatsapp', description: 'WhatsApp integration' },
        { name: 'whatsapp-admin', description: 'WhatsApp administration' },
        { name: 'lgpd', description: 'LGPD data privacy' },
        { name: 'admin', description: 'Admin utilities' },
    ],
    paths: {
        '/api/health': {
            get: { tags: ['health'], summary: 'Health check', description: 'Returns system health including DB, Redis, WhatsApp, and memory status', responses: { 200: { description: 'Healthy' }, 503: { description: 'Unhealthy' } } },
        },
        '/api/metrics': {
            get: { tags: ['health'], summary: 'Application metrics', description: 'Returns request counters, latency histograms, and memory usage', responses: { 200: { description: 'Metrics snapshot' } } },
        },
        '/api/csrf': {
            get: { tags: ['auth'], summary: 'Get CSRF token', responses: { 200: { description: 'CSRF token' } } },
        },
        '/api/auth/{nextauth}': {
            get: { tags: ['auth'], summary: 'NextAuth handler', parameters: [{ name: 'nextauth', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Auth response' } } },
            post: { tags: ['auth'], summary: 'NextAuth handler', parameters: [{ name: 'nextauth', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Auth response' } } },
        },
        '/api/pacientes/search': {
            get: { tags: ['pacientes'], summary: 'Search patients', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Search results' } } },
        },
        '/api/admin/pacientes': {
            get: { tags: ['pacientes'], summary: 'List patients', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } }, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Paginated patient list' } } },
            post: { tags: ['pacientes'], summary: 'Create patient', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Patient created' } } },
        },
        '/api/admin/pacientes/{id}': {
            get: { tags: ['pacientes'], summary: 'Get patient by ID', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Patient details' } } },
            patch: { tags: ['pacientes'], summary: 'Update patient', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Patient updated' } } },
        },
        '/api/admin/candidatos': {
            get: { tags: ['cuidadores'], summary: 'List candidates', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated candidate list' } } },
            post: { tags: ['cuidadores'], summary: 'Create candidate', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Candidate created' } } },
        },
        '/api/admin/candidatos/{id}': {
            get: { tags: ['cuidadores'], summary: 'Get candidate', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Candidate details' } } },
            patch: { tags: ['cuidadores'], summary: 'Update candidate', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Candidate updated' } } },
            delete: { tags: ['cuidadores'], summary: 'Delete candidate', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Candidate deleted' } } },
        },
        '/api/admin/avaliacoes': {
            get: { tags: ['avaliacoes'], summary: 'List evaluations', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated evaluation list' } } },
            post: { tags: ['avaliacoes'], summary: 'Create evaluation', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Evaluation created' } } },
        },
        '/api/admin/avaliacoes/{id}': {
            get: { tags: ['avaliacoes'], summary: 'Get evaluation', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Evaluation details' } } },
            patch: { tags: ['avaliacoes'], summary: 'Update evaluation', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Evaluation updated' } } },
            delete: { tags: ['avaliacoes'], summary: 'Delete evaluation', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Evaluation deleted' } } },
        },
        '/api/admin/avaliacoes/{id}/orcamento-preview': {
            post: { tags: ['avaliacoes'], summary: 'Preview budget from evaluation', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Budget preview' } } },
        },
        '/api/admin/avaliacoes/{id}/send-proposta': {
            post: { tags: ['avaliacoes'], summary: 'Send proposal via WhatsApp', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Proposal sent' } } },
        },
        '/api/admin/avaliacoes/{id}/send-contrato': {
            post: { tags: ['avaliacoes'], summary: 'Send contract via WhatsApp', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Contract sent' } } },
        },
        '/api/admin/orcamentos': {
            get: { tags: ['orcamentos'], summary: 'List budgets', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated budget list' } } },
            post: { tags: ['orcamentos'], summary: 'Create budget', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Budget created' } } },
        },
        '/api/admin/orcamentos/{id}': {
            get: { tags: ['orcamentos'], summary: 'Get budget', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Budget details' } } },
            patch: { tags: ['orcamentos'], summary: 'Update budget', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Budget updated' } } },
        },
        '/api/admin/orcamentos/{id}/recalculate': {
            post: { tags: ['orcamentos'], summary: 'Recalculate budget', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Budget recalculated' } } },
        },
        '/api/admin/alocacoes': {
            get: { tags: ['alocacoes'], summary: 'List allocations', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated allocation list' } } },
            post: { tags: ['alocacoes'], summary: 'Create allocation', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Allocation created' } } },
        },
        '/api/admin/alocacoes/{id}': {
            patch: { tags: ['alocacoes'], summary: 'Update allocation', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Allocation updated' } } },
        },
        '/api/admin/dashboard/stats': {
            get: { tags: ['admin'], summary: 'Dashboard statistics', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Dashboard stats' } } },
        },
        '/api/admin/logs': {
            get: { tags: ['admin'], summary: 'List system logs', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated log entries' } } },
            delete: { tags: ['admin'], summary: 'Delete old logs', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Logs deleted' } } },
        },
        '/api/admin/leads': {
            get: { tags: ['admin'], summary: 'List leads', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Leads list' } } },
        },
        '/api/admin/lgpd': {
            get: { tags: ['lgpd'], summary: 'Export subject data or list consents', security: [{ bearerAuth: [] }], parameters: [{ name: 'subjectType', in: 'query', required: true, schema: { type: 'string', enum: ['PACIENTE', 'CUIDADOR'] } }, { name: 'subjectId', in: 'query', required: true, schema: { type: 'string' } }, { name: 'action', in: 'query', schema: { type: 'string', enum: ['export', 'consents'], default: 'export' } }], responses: { 200: { description: 'Subject data or consent records' } } },
            post: { tags: ['lgpd'], summary: 'Record consent, revoke consent, or anonymize data', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Action completed' } } },
        },
        '/api/whatsapp/webhook': {
            get: { tags: ['whatsapp'], summary: 'Webhook verification', responses: { 200: { description: 'Verification response' } } },
            post: { tags: ['whatsapp'], summary: 'Receive webhook events', responses: { 200: { description: 'Event processed' } } },
        },
        '/api/whatsapp/status': {
            get: { tags: ['whatsapp'], summary: 'WhatsApp connection status', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Connection status' } } },
        },
        '/api/whatsapp/connect': {
            post: { tags: ['whatsapp'], summary: 'Connect to WhatsApp', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Connection initiated' } } },
        },
        '/api/whatsapp/disconnect': {
            post: { tags: ['whatsapp'], summary: 'Disconnect WhatsApp', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Disconnected' } } },
        },
        '/api/admin/whatsapp/labels': {
            get: { tags: ['whatsapp-admin'], summary: 'List labels', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Labels list' } } },
            post: { tags: ['whatsapp-admin'], summary: 'Create label', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Label created' } } },
        },
        '/api/admin/whatsapp/templates': {
            get: { tags: ['whatsapp-admin'], summary: 'List message templates', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Templates list' } } },
            post: { tags: ['whatsapp-admin'], summary: 'Create template', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Template created' } } },
        },
        '/api/admin/whatsapp/quick-replies': {
            get: { tags: ['whatsapp-admin'], summary: 'List quick replies', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Quick replies list' } } },
            post: { tags: ['whatsapp-admin'], summary: 'Create quick reply', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Quick reply created' } } },
        },
        '/api/admin/whatsapp/contacts': {
            get: { tags: ['whatsapp-admin'], summary: 'List contacts', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Contacts list' } } },
            post: { tags: ['whatsapp-admin'], summary: 'Create/update contact', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Contact saved' } } },
        },
        '/api/admin/whatsapp/queue': {
            get: { tags: ['whatsapp-admin'], summary: 'List message queue', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Queue items' } } },
            post: { tags: ['whatsapp-admin'], summary: 'Enqueue message', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Message enqueued' } } },
        },
        '/api/admin/whatsapp/analytics': {
            get: { tags: ['whatsapp-admin'], summary: 'WhatsApp analytics', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Analytics data' } } },
        },
        '/api/openapi': {
            get: { tags: ['health'], summary: 'OpenAPI specification', responses: { 200: { description: 'OpenAPI 3.1 JSON spec' } } },
        },
    },
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
            ApiSuccess: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object' },
                    meta: { $ref: '#/components/schemas/ApiMeta' },
                },
            },
            ApiError: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            code: { type: 'string' },
                            message: { type: 'string' },
                            details: { type: 'object' },
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
            Pagination: {
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
        },
    },
};

export async function GET() {
    return NextResponse.json(OPENAPI_SPEC, {
        headers: {
            'Cache-Control': 'public, max-age=3600',
            'Content-Type': 'application/json',
        },
    });
}
