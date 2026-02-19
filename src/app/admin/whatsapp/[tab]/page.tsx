import { redirect } from 'next/navigation';
import WhatsAppAdminPage from '../page';
import { DEFAULT_WHATSAPP_ADMIN_TAB, normalizeWhatsAppAdminTab } from '@/lib/whatsapp/admin-tabs';

interface TabPageProps {
    params: Promise<{ tab: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function buildQueryString(searchParams: Record<string, string | string[] | undefined>): string {
    const query = new URLSearchParams();
    for (const [key, rawValue] of Object.entries(searchParams)) {
        if (rawValue === undefined) continue;
        if (Array.isArray(rawValue)) {
            for (const value of rawValue) query.append(key, value);
            continue;
        }
        query.set(key, rawValue);
    }

    const serialized = query.toString();
    return serialized ? `?${serialized}` : '';
}

export default async function WhatsAppTabPage({ params, searchParams }: TabPageProps) {
    const [{ tab }, query] = await Promise.all([params, searchParams]);
    const normalizedTab = normalizeWhatsAppAdminTab(tab);
    if (!normalizedTab) {
        redirect(`/admin/whatsapp/${DEFAULT_WHATSAPP_ADMIN_TAB}`);
    }

    if (normalizedTab !== tab) {
        redirect(`/admin/whatsapp/${normalizedTab}${buildQueryString(query)}`);
    }

    return <WhatsAppAdminPage />;
}
