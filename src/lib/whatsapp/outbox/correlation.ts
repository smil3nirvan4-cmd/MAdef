export interface QueueCorrelationTermsInput {
    queueItemId?: string | null;
    internalMessageId?: string | null;
    idempotencyKey?: string | null;
    providerMessageId?: string | null;
    resolvedMessageId?: string | null;
    phone?: string | null;
    jid?: string | null;
}

export function buildQueueCorrelationTerms(input: QueueCorrelationTermsInput): string[] {
    const terms = [
        input.queueItemId,
        input.internalMessageId,
        input.idempotencyKey,
        input.providerMessageId,
        input.resolvedMessageId,
        input.phone,
        input.jid,
    ]
        .map((term) => String(term || '').trim())
        .filter((term) => term.length >= 4);

    return [...new Set(terms)];
}
