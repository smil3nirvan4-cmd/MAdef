const PLACEHOLDER_REGEX = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

function valueToString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
}

export function listTemplateVariables(content: string): string[] {
    const found = new Set<string>();
    for (const match of content.matchAll(PLACEHOLDER_REGEX)) {
        if (match[1]) found.add(match[1]);
    }
    return Array.from(found);
}

export function renderTemplateContent(
    content: string,
    variables: Record<string, unknown>
): {
    rendered: string;
    missingVariables: string[];
    variablesUsed: string[];
} {
    const missing = new Set<string>();
    const used = new Set<string>();

    const rendered = content.replace(PLACEHOLDER_REGEX, (_full, variableName: string) => {
        used.add(variableName);

        if (!Object.prototype.hasOwnProperty.call(variables, variableName)) {
            missing.add(variableName);
            return `{{${variableName}}}`;
        }

        return valueToString(variables[variableName]);
    });

    return {
        rendered,
        missingVariables: Array.from(missing),
        variablesUsed: Array.from(used),
    };
}

