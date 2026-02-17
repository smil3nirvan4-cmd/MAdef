export function extractProviderMessageId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;

    const source = payload as any;
    const candidates = [
        source?.providerMessageId,
        source?.messageId,
        source?.id,
        source?.key?.id,
        source?.data?.key?.id,
        source?.message?.key?.id,
        source?.messages?.[0]?.key?.id,
        source?.result?.key?.id,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }

    return null;
}

