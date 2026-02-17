import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolveBridgeConfig } from '@/lib/whatsapp/bridge-config';
import type { AdminRole } from '@/lib/auth/roles';

export interface AdminCapability {
    key: string;
    label: string;
    route: string;
    api: string;
    enabled: boolean;
    category: 'core' | 'whatsapp' | 'operations';
}

export interface CapabilitiesResponse {
    generatedAt: string;
    role: AdminRole;
    modules: AdminCapability[];
    whatsappHealth: {
        bridgeRunning: boolean;
        connected: boolean;
        status: string;
        retryCount: number;
        lastStatusCode: number | null;
        credentialsValid: boolean;
    };
}

interface BuildCapabilitiesOptions {
    role?: AdminRole;
}

function appPathExists(...parts: string[]): boolean {
    return existsSync(path.join(process.cwd(), 'src', 'app', ...parts));
}

function isApiRouteEnabled(apiRoute: string): boolean {
    const routePath = apiRoute
        .replace(/^\/api\//, '')
        .split('/')
        .join(path.sep);
    return appPathExists('api', ...routePath.split(path.sep), 'route.ts');
}

export async function readWhatsAppHealth(): Promise<CapabilitiesResponse['whatsappHealth']> {
    const bridgeConfig = resolveBridgeConfig();

    try {
        const response = await fetch(`${bridgeConfig.bridgeUrl}/status`, {
            signal: AbortSignal.timeout(2500),
        });

        if (!response.ok) {
            return {
                bridgeRunning: true,
                connected: false,
                status: `http_${response.status}`,
                retryCount: 0,
                lastStatusCode: null,
                credentialsValid: response.status !== 401,
            };
        }

        const payload: any = await response.json().catch(() => ({}));
        return {
            bridgeRunning: true,
            connected: Boolean(payload?.connected),
            status: String(payload?.status || (payload?.connected ? 'CONNECTED' : 'DISCONNECTED')),
            retryCount: Number(payload?.retryCount || 0),
            lastStatusCode: payload?.lastStatusCode ?? null,
            credentialsValid: Number(payload?.lastStatusCode || 0) !== 401,
        };
    } catch {
        return {
            bridgeRunning: false,
            connected: false,
            status: 'OFFLINE',
            retryCount: 0,
            lastStatusCode: null,
            credentialsValid: false,
        };
    }
}

export async function buildAdminCapabilities(options: BuildCapabilitiesOptions = {}): Promise<CapabilitiesResponse> {
    const role = options.role || 'LEITURA';
    const modules: AdminCapability[] = [
        { key: 'dashboard', label: 'Dashboard', route: '/admin/dashboard', api: '/api/admin/dashboard/stats', category: 'core', enabled: false },
        { key: 'pacientes', label: 'Pacientes', route: '/admin/pacientes', api: '/api/admin/pacientes', category: 'core', enabled: false },
        { key: 'avaliacoes', label: 'Avaliacoes', route: '/admin/avaliacoes', api: '/api/admin/avaliacoes', category: 'core', enabled: false },
        { key: 'orcamentos', label: 'Orcamentos', route: '/admin/orcamentos', api: '/api/admin/orcamentos', category: 'core', enabled: false },
        { key: 'leads', label: 'Leads', route: '/admin/leads', api: '/api/admin/leads', category: 'operations', enabled: false },
        { key: 'triagens', label: 'Triagens', route: '/admin/triagens', api: '/api/admin/whatsapp/flows', category: 'operations', enabled: false },
        { key: 'alocacoes', label: 'Alocacao', route: '/admin/alocacao', api: '/api/admin/alocacoes', category: 'operations', enabled: false },
        { key: 'candidatos', label: 'Candidatos', route: '/admin/candidatos', api: '/api/admin/candidatos', category: 'operations', enabled: false },
        { key: 'cuidadores', label: 'Cuidadores', route: '/admin/cuidadores', api: '/api/admin/candidatos', category: 'operations', enabled: false },
        { key: 'usuarios', label: 'Usuarios', route: '/admin/usuarios', api: '/api/admin/usuarios', category: 'operations', enabled: false },
        { key: 'logs', label: 'Logs', route: '/admin/logs', api: '/api/admin/logs', category: 'operations', enabled: false },
        { key: 'whatsapp', label: 'WhatsApp', route: '/admin/whatsapp', api: '/api/admin/whatsapp/contacts', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_contacts', label: 'WA Contacts', route: '/admin/whatsapp/contacts', api: '/api/admin/whatsapp/contacts', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_chat', label: 'WA Chat', route: '/admin/whatsapp/chats', api: '/api/admin/whatsapp/chat/[phone]', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_flow_definitions', label: 'WA Flow Definitions', route: '/admin/whatsapp/flows', api: '/api/admin/whatsapp/flow-definitions', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_templates', label: 'WA Templates', route: '/admin/whatsapp/templates', api: '/api/admin/whatsapp/templates', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_quick_replies', label: 'WA Quick Replies', route: '/admin/whatsapp/quickreplies', api: '/api/admin/whatsapp/quick-replies', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_autoreplies', label: 'WA Auto Replies', route: '/admin/whatsapp/autoreplies', api: '/api/admin/whatsapp/autoreplies', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_scheduled', label: 'WA Scheduled', route: '/admin/whatsapp/scheduled', api: '/api/admin/whatsapp/scheduled', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_queue', label: 'WA Queue', route: '/admin/whatsapp/queue', api: '/api/admin/whatsapp/queue', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_labels', label: 'WA Labels', route: '/admin/whatsapp/labels', api: '/api/admin/whatsapp/labels', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_blacklist', label: 'WA Blacklist', route: '/admin/whatsapp/blacklist', api: '/api/admin/whatsapp/blacklist', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_webhooks', label: 'WA Webhooks', route: '/admin/whatsapp/webhooks', api: '/api/admin/whatsapp/webhooks', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_analytics', label: 'WA Analytics', route: '/admin/whatsapp/analytics', api: '/api/admin/whatsapp/analytics', category: 'whatsapp', enabled: false },
        { key: 'whatsapp_settings', label: 'WA Settings', route: '/admin/whatsapp/settings', api: '/api/admin/whatsapp/settings', category: 'whatsapp', enabled: false },
    ];

    for (const module of modules) {
        const routeEnabled = appPathExists(...module.route.replace(/^\//, '').split('/'), 'page.tsx')
            || appPathExists(...module.route.replace(/^\//, '').split('/'), 'loading.tsx')
            || module.route.startsWith('/admin/whatsapp/');

        const blockedForOperador = role === 'OPERADOR'
            && (module.key === 'usuarios' || module.key === 'whatsapp_settings');
        const blockedForLeitura = role === 'LEITURA'
            && module.key === 'usuarios';

        module.enabled = routeEnabled
            && isApiRouteEnabled(module.api)
            && !blockedForOperador
            && !blockedForLeitura;
    }

    return {
        generatedAt: new Date().toISOString(),
        role,
        modules,
        whatsappHealth: await readWhatsAppHealth(),
    };
}
