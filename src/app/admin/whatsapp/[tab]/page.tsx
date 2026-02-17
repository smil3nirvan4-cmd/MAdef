import { redirect } from 'next/navigation';

const VALID_TABS = new Set([
    'connection',
    'chats',
    'contacts',
    'flows',
    'templates',
    'quickreplies',
    'autoreplies',
    'scheduled',
    'broadcast',
    'queue',
    'labels',
    'blacklist',
    'webhooks',
    'analytics',
    'automation',
    'settings',
    'config',
]);

export default async function WhatsAppTabPage(
    { params }: { params: Promise<{ tab: string }> }
) {
    const { tab } = await params;
    const normalized = String(tab || '').toLowerCase();
    let target = VALID_TABS.has(normalized) ? normalized : 'connection';
    if (target === 'settings') target = 'automation';
    redirect(`/admin/whatsapp?tab=${target}`);
}
