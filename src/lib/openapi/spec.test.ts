import { describe, it, expect } from 'vitest';
import { getOpenAPISpec } from './spec';

describe('getOpenAPISpec', () => {
    const spec = getOpenAPISpec();

    it('has openapi field set to "3.0.0"', () => {
        expect(spec.openapi).toBe('3.0.0');
    });

    it('has info.title and info.version', () => {
        expect(spec.info.title).toBe('MAdef API');
        expect(spec.info.version).toBe('1.0.0');
    });

    it('has a description in info', () => {
        expect(spec.info.description).toBeTruthy();
        expect(spec.info.description).toContain('M\u00e3os Amigas');
    });

    it('has at least one server entry', () => {
        expect(spec.servers).toBeDefined();
        expect(spec.servers.length).toBeGreaterThanOrEqual(1);
        expect(spec.servers[0].url).toBe('/api');
    });

    it('has paths with at least 10 entries', () => {
        const pathCount = Object.keys(spec.paths).length;
        expect(pathCount).toBeGreaterThanOrEqual(10);
    });

    it('has components.schemas with at least 5 entries', () => {
        const schemaCount = Object.keys(spec.components.schemas).length;
        expect(schemaCount).toBeGreaterThanOrEqual(5);
    });

    it('has components.securitySchemes', () => {
        expect(spec.components.securitySchemes).toBeDefined();
        expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
        expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
        expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
        expect(spec.components.securitySchemes.sessionCookie).toBeDefined();
        expect(spec.components.securitySchemes.sessionCookie.type).toBe('apiKey');
        expect(spec.components.securitySchemes.sessionCookie.in).toBe('cookie');
        expect(spec.components.securitySchemes.sessionCookie.name).toBe('next-auth.session-token');
    });

    it('has the expected tags', () => {
        const tagNames = spec.tags.map((t: { name: string }) => t.name);
        expect(tagNames).toContain('Admin');
        expect(tagNames).toContain('Pacientes');
        expect(tagNames).toContain('Cuidadores');
        expect(tagNames).toContain('Avaliacoes');
        expect(tagNames).toContain('Orcamentos');
        expect(tagNames).toContain('Alocacoes');
        expect(tagNames).toContain('WhatsApp');
        expect(tagNames).toContain('LGPD');
        expect(tagNames).toContain('Health');
    });

    it('all protected paths reference security schemes', () => {
        const publicPaths = ['/health'];

        for (const [path, methods] of Object.entries(spec.paths)) {
            if (publicPaths.includes(path)) continue;

            const methodEntries = methods as Record<string, { security?: unknown[] }>;
            for (const [method, operation] of Object.entries(methodEntries)) {
                expect(
                    operation.security,
                    `${method.toUpperCase()} ${path} should have security defined`
                ).toBeDefined();
                expect(
                    Array.isArray(operation.security),
                    `${method.toUpperCase()} ${path} security should be an array`
                ).toBe(true);
                expect(
                    operation.security!.length,
                    `${method.toUpperCase()} ${path} should have at least one security scheme`
                ).toBeGreaterThan(0);
            }
        }
    });

    it('includes key domain schemas', () => {
        const schemaNames = Object.keys(spec.components.schemas);
        expect(schemaNames).toContain('Paciente');
        expect(schemaNames).toContain('Cuidador');
        expect(schemaNames).toContain('Avaliacao');
        expect(schemaNames).toContain('Orcamento');
        expect(schemaNames).toContain('Alocacao');
        expect(schemaNames).toContain('ConsentRecord');
        expect(schemaNames).toContain('SuccessResponse');
        expect(schemaNames).toContain('ErrorResponse');
        expect(schemaNames).toContain('PaginatedResponse');
    });

    it('includes the health endpoint without security', () => {
        const health = spec.paths['/health'];
        expect(health).toBeDefined();
        expect(health.get).toBeDefined();
        expect((health.get as Record<string, unknown>).security).toBeUndefined();
    });

    it('includes LGPD endpoints', () => {
        expect(spec.paths['/admin/lgpd/export/{pacienteId}']).toBeDefined();
        expect(spec.paths['/admin/lgpd/anonymize/{pacienteId}']).toBeDefined();
        expect(spec.paths['/admin/lgpd/consent/{pacienteId}']).toBeDefined();
    });

    it('ErrorResponse schema has required fields', () => {
        const errorSchema = spec.components.schemas.ErrorResponse;
        expect(errorSchema.properties.success).toBeDefined();
        expect(errorSchema.properties.error).toBeDefined();
        expect(errorSchema.properties.meta).toBeDefined();
        expect(errorSchema.required).toContain('success');
        expect(errorSchema.required).toContain('error');
        expect(errorSchema.required).toContain('meta');
    });

    it('PaginatedResponse schema has pagination object', () => {
        const paginatedSchema = spec.components.schemas.PaginatedResponse;
        expect(paginatedSchema.properties.pagination).toBeDefined();
        const pagination = paginatedSchema.properties.pagination;
        expect(pagination.properties.page).toBeDefined();
        expect(pagination.properties.pageSize).toBeDefined();
        expect(pagination.properties.total).toBeDefined();
        expect(pagination.properties.totalPages).toBeDefined();
        expect(pagination.properties.hasNext).toBeDefined();
        expect(pagination.properties.hasPrev).toBeDefined();
    });
});
