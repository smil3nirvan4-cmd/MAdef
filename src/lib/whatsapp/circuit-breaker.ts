export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    openDurationMs: number;
    monitoredStatusCodes: number[];
}

interface CircuitSnapshot {
    state: CircuitState;
    failureCount: number;
    lastFailureAt: string | null;
    openUntil: string | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 1,
    openDurationMs: 60_000,
    monitoredStatusCodes: [500, 502, 503, 504],
};

export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failureCount = 0;
    private halfOpenSuccessCount = 0;
    private lastFailureAt: Date | null = null;
    private openUntil: Date | null = null;
    private readonly config: CircuitBreakerConfig;

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
        };
    }

    getState(): CircuitState {
        this.advanceStateIfNeeded();
        return this.state;
    }

    getFailureCount(): number {
        return this.failureCount;
    }

    getLastFailureAt(): Date | null {
        return this.lastFailureAt;
    }

    getOpenUntil(): Date | null {
        return this.openUntil;
    }

    isOpen(): boolean {
        this.advanceStateIfNeeded();
        return this.state === 'OPEN';
    }

    recordSuccess(): void {
        this.advanceStateIfNeeded();
        if (this.state === 'HALF_OPEN') {
            this.halfOpenSuccessCount += 1;
            if (this.halfOpenSuccessCount >= this.config.successThreshold) {
                this.closeCircuit();
            }
        }
    }

    recordFailure(statusCode?: number): void {
        if (statusCode !== undefined && !this.config.monitoredStatusCodes.includes(statusCode)) {
            return;
        }

        this.lastFailureAt = new Date();
        this.advanceStateIfNeeded();

        if (this.state === 'HALF_OPEN') {
            this.openCircuit();
            return;
        }

        if (this.state === 'OPEN') {
            this.openCircuit();
            return;
        }

        this.failureCount += 1;
        if (this.failureCount >= this.config.failureThreshold) {
            this.openCircuit();
        }
    }

    toJSON(): CircuitSnapshot {
        this.advanceStateIfNeeded();
        return {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureAt: this.lastFailureAt ? this.lastFailureAt.toISOString() : null,
            openUntil: this.openUntil ? this.openUntil.toISOString() : null,
        };
    }

    private advanceStateIfNeeded(): void {
        if (this.state !== 'OPEN') return;
        if (!this.openUntil) return;
        if (Date.now() < this.openUntil.getTime()) return;

        this.state = 'HALF_OPEN';
        this.halfOpenSuccessCount = 0;
    }

    private openCircuit(): void {
        this.state = 'OPEN';
        this.openUntil = new Date(Date.now() + this.config.openDurationMs);
        this.halfOpenSuccessCount = 0;
        this.failureCount = Math.max(this.failureCount, this.config.failureThreshold);
    }

    private closeCircuit(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.halfOpenSuccessCount = 0;
        this.openUntil = null;
    }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
}

export const whatsappCircuitBreaker = new CircuitBreaker({
    failureThreshold: parsePositiveInt(process.env.WA_CIRCUIT_FAILURE_THRESHOLD, 5),
    openDurationMs: parsePositiveInt(process.env.WA_CIRCUIT_OPEN_MS, 60_000),
    successThreshold: 1,
    monitoredStatusCodes: [500, 502, 503, 504],
});
