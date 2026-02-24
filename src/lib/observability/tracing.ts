import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

const isOtelEnabled = process.env.OTEL_ENABLED === 'true';
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

let sdk: NodeSDK | null = null;

export function initTracing(): void {
    if (!isOtelEnabled) {
        return;
    }

    const exporter = otelEndpoint
        ? new OTLPTraceExporter({ url: `${otelEndpoint}/v1/traces` })
        : new ConsoleSpanExporter();

    sdk = new NodeSDK({
        resource: resourceFromAttributes({
            [ATTR_SERVICE_NAME]: 'madef-api',
            [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '0.1.0',
        }),
        traceExporter: exporter,
        instrumentations: [
            new HttpInstrumentation(),
        ],
    });

    sdk.start();

    process.on('SIGTERM', () => {
        sdk?.shutdown().catch(() => {});
    });
}

export function getSDK(): NodeSDK | null {
    return sdk;
}
