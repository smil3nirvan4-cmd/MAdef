'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface SystemLogRecord {
    id: string;
    type: string;
    action: string;
    message: string;
    metadata: string | null;
    stack: string | null;
    userId: string | null;
    createdAt: string;
    duration: number | null;
}

interface LogDetailResponse {
    success: boolean;
    data?: { log: SystemLogRecord };
    error?: { message?: string };
}

const TYPE_VARIANTS: Record<string, BadgeVariant> = {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    WHATSAPP: 'success',
    DEBUG: 'default',
};

function safeParseMetadata(metadata: string | null): string {
    if (!metadata) return '{}';
    try {
        return JSON.stringify(JSON.parse(metadata), null, 2);
    } catch {
        return metadata;
    }
}

export default function LogDetailPage() {
    const params = useParams<{ id: string }>();
    const [log, setLog] = useState<SystemLogRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!params?.id) return;

        let active = true;
        const fetchLog = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/admin/logs/${params.id}`, { cache: 'no-store' });
                const payload: LogDetailResponse = await response.json().catch(() => ({ success: false }));
                if (!response.ok || !payload.success || !payload.data?.log) {
                    throw new Error(payload.error?.message || 'Failed to load log');
                }
                if (active) setLog(payload.data.log);
            } catch (fetchError) {
                if (active) setError(fetchError instanceof Error ? fetchError.message : 'Failed to load log');
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchLog();
        return () => {
            active = false;
        };
    }, [params?.id]);

    const metadata = useMemo(() => safeParseMetadata(log?.metadata || null), [log?.metadata]);

    if (loading) {
        return <div className="p-6 lg:p-8 text-sm text-muted-foreground">Loading log...</div>;
    }

    if (error || !log) {
        return (
            <div className="p-6 lg:p-8 space-y-4">
                <PageHeader
                    title="Log Detail"
                    description={error || 'Log not found'}
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/admin/dashboard' },
                        { label: 'Logs', href: '/admin/logs' },
                        { label: 'Detail' },
                    ]}
                />
                <Card>
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-error-600">{error || 'Log not found'}</p>
                        <Link href="/admin/logs">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-4">
            <PageHeader
                title="Log Detail"
                description={log.action}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Logs', href: '/admin/logs' },
                    { label: log.id },
                ]}
                actions={(
                    <Link href="/admin/logs">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                )}
            />

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Type</p>
                    <Badge variant={TYPE_VARIANTS[log.type] || 'default'}>{log.type}</Badge>
                </Card>
                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">User</p>
                    <p className="text-sm text-foreground">{log.userId || '-'}</p>
                </Card>
                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Created</p>
                    <p className="text-sm text-foreground">{new Date(log.createdAt).toLocaleString('pt-BR')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Duration: {log.duration ?? '-'} ms</p>
                </Card>
            </div>

            <Card>
                <p className="mb-2 text-xs uppercase text-muted-foreground">Message</p>
                <p className="text-sm text-foreground">{log.message}</p>
            </Card>

            <Card>
                <p className="mb-2 text-xs uppercase text-muted-foreground">Metadata</p>
                <pre className="max-h-[480px] overflow-auto rounded-lg bg-neutral-900 p-4 text-xs text-green-300">
                    {metadata}
                </pre>
            </Card>

            {log.stack ? (
                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Stack</p>
                    <pre className="max-h-[360px] overflow-auto rounded-lg bg-neutral-900 p-4 text-xs text-red-300">
                        {log.stack}
                    </pre>
                </Card>
            ) : null}
        </div>
    );
}

