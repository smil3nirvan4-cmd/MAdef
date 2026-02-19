const PLACEHOLDER_RE = /<<\s*([a-zA-Z0-9_.-]+)\s*>>/g;

export const REQUIRED_CONTRACT_PLACEHOLDERS = [
    'orcamento.id',
    'paciente.nome',
    'unidade.nome',
    'contrato.tipo',
    'preco.total',
    'preco.prestador',
    'preco.taxa_maos_amigas',
    'escala.resumo',
    'datas.inicio',
    'datas.fim',
    'pagamento.metodo',
    'pagamento.vencimento',
];

export function extractPlaceholders(template: string): string[] {
    const found = new Set<string>();
    let match: RegExpExecArray | null = PLACEHOLDER_RE.exec(template);
    while (match) {
        found.add(match[1]);
        match = PLACEHOLDER_RE.exec(template);
    }
    return [...found].sort((a, b) => a.localeCompare(b));
}

function resolvePath(data: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let cursor: unknown = data;
    for (const part of parts) {
        if (!cursor || typeof cursor !== 'object') return undefined;
        cursor = (cursor as Record<string, unknown>)[part];
    }
    return cursor;
}

function stringifyValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
}

export interface RenderContractResult {
    content: string;
    placeholders: string[];
    pending: string[];
}

export function renderContract(
    template: string,
    data: Record<string, unknown>,
): RenderContractResult {
    const placeholders = extractPlaceholders(template);
    const pending: string[] = [];

    const content = template.replace(PLACEHOLDER_RE, (_raw, key) => {
        const value = resolvePath(data, String(key));
        if (value === null || value === undefined || value === '') {
            pending.push(String(key));
            return `<<${String(key)}>>`;
        }
        return stringifyValue(value);
    });

    return {
        content,
        placeholders,
        pending: [...new Set(pending)].sort((a, b) => a.localeCompare(b)),
    };
}

export function validateRequiredPlaceholders(placeholders: string[]): string[] {
    const current = new Set(placeholders);
    return REQUIRED_CONTRACT_PLACEHOLDERS.filter((required) => !current.has(required));
}
