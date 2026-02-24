/**
 * Generic Circuit Breaker with execute() wrapper pattern.
 * See also: src/lib/whatsapp/circuit-breaker.ts for the WhatsApp-specific instance.
 */

export interface CircuitBreakerOptions {
    name: string;
    threshold: number;
    resetTimeMs: number;
    timeoutMs?: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export class GenericCircuitBreaker {
    private state: CircuitState = 'closed';
    private failureCount = 0;
    private lastFailureTime = 0;
    private successCount = 0;

    constructor(private options: CircuitBreakerOptions) {}

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime > this.options.resetTimeMs) {
                this.state = 'half-open';
            } else {
                throw new Error(`Circuit ${this.options.name} is OPEN`);
            }
        }

        try {
            const result = await this.withTimeout(fn);
            this.onSuccess();
            return result;
        } catch (err) {
            this.onFailure();
            throw err;
        }
    }

    private onSuccess(): void {
        this.failureCount = 0;
        if (this.state === 'half-open') {
            this.successCount++;
            if (this.successCount >= 2) {
                this.state = 'closed';
                this.successCount = 0;
            }
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.options.threshold) {
            this.state = 'open';
        }
    }

    private withTimeout<T>(fn: () => Promise<T>): Promise<T> {
        const timeout = this.options.timeoutMs || 10000;
        return Promise.race([
            fn(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout ${timeout}ms`)), timeout)
            ),
        ]);
    }

    getState(): CircuitState {
        return this.state;
    }

    reset(): void {
        this.state = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = 0;
    }
}
