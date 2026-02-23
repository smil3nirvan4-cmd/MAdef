import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';

interface AdminWhatsappContact {
    telefone: string | null;
    phone: string | null;
    name: string | null;
    type: string;
    entityId: string | null;
    entityStatus: string | null;
    totalMessages: number;
    messagesIn: number;
    messagesOut: number;
    lastMessage: Date | string | null;
    jid: string | null;
}

function normalizePhone(value: string | null | undefined): string {
    return String(value || '')
        .replace('@s.whatsapp.net', '')
        .replace('@lid', '')
        .replace(/\D/g, '');
}

function toTimestamp(value: Date | string | null | undefined): number {
    const time = new Date(String(value || '')).getTime();
    return Number.isFinite(time) ? time : 0;
}

function mergeContact(current: AdminWhatsappContact, next: AdminWhatsappContact): AdminWhatsappContact {
    const currentTs = toTimestamp(current.lastMessage);
    const nextTs = toTimestamp(next.lastMessage);
    const preferNextByTime = nextTs > currentTs;
    const preferNextByType = current.type === 'unknown' && next.type !== 'unknown';
    const preferred = (preferNextByTime || preferNextByType) ? next : current;

    return {
        ...current,
        ...preferred,
        phone: normalizePhone(preferred.phone || preferred.telefone),
        totalMessages: Math.max(0, Number(current.totalMessages || 0)) + Math.max(0, Number(next.totalMessages || 0)),
        messagesIn: Math.max(0, Number(current.messagesIn || 0)) + Math.max(0, Number(next.messagesIn || 0)),
        messagesOut: Math.max(0, Number(current.messagesOut || 0)) + Math.max(0, Number(next.messagesOut || 0)),
        lastMessage: preferNextByTime ? next.lastMessage : current.lastMessage,
    };
}

function dedupeContacts(rows: AdminWhatsappContact[]): AdminWhatsappContact[] {
    const map = new Map<string, AdminWhatsappContact>();
    const fallbackOrder: AdminWhatsappContact[] = [];

    for (const row of rows) {
        const phone = normalizePhone(row.phone || row.telefone);
        if (!phone) {
            fallbackOrder.push(row);
            continue;
        }

        const normalized: AdminWhatsappContact = {
            ...row,
            phone,
        };

        const existing = map.get(phone);
        if (!existing) {
            map.set(phone, normalized);
            continue;
        }

        map.set(phone, mergeContact(existing, normalized));
    }

    const deduped = [...map.values(), ...fallbackOrder];
    deduped.sort((a, b) => toTimestamp(b.lastMessage) - toTimestamp(a.lastMessage));
    return deduped;
}

export async function GET(request: NextRequest) {
    try {
        const guard = await guardCapability('VIEW_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const type = searchParams.get('type'); // cuidador, paciente, all

        // Manual contacts cadastrados explicitamente
        const manualContacts = await prisma.whatsAppContact.findMany({
            where: search
                ? {
                    OR: [
                        { phone: { contains: search } },
                        { name: { contains: search } },
                    ],
                }
                : undefined,
            orderBy: { updatedAt: 'desc' },
            take: 100,
        });

        // Contatos inferidos pelo histórico de mensagens
        const rawContacts = await prisma.mensagem.groupBy({
            by: ['telefone'],
            _count: { id: true },
            _max: { timestamp: true },
            orderBy: { _max: { timestamp: 'desc' } },
            take: 200,
            where: search ? { telefone: { contains: search } } : undefined,
        });

        const manualByPhone = new Map(
            manualContacts.map((c) => [c.phone.replace(/\D/g, ''), c])
        );

        // Get message direction counts separately
        const contacts = await Promise.all(rawContacts.map(async (c) => {
            const phone = c.telefone?.replace('@s.whatsapp.net', '').replace('@lid', '');
            const phoneDigits = (phone || '').replace(/\D/g, '');
            const manual = manualByPhone.get(phoneDigits);

            // Count IN/OUT messages
            const inCount = await prisma.mensagem.count({ where: { telefone: c.telefone, direcao: 'IN' } });
            const outCount = await prisma.mensagem.count({ where: { telefone: c.telefone, direcao: 'OUT' } });

            // Enrich with cuidador/paciente data
            const cuidador = phone ? await prisma.cuidador.findFirst({
                where: { telefone: { contains: phone.slice(-8) } },
                select: { id: true, nome: true, status: true }
            }) : null;

            const paciente = phone ? await prisma.paciente.findFirst({
                where: { telefone: { contains: phone.slice(-8) } },
                select: { id: true, nome: true, status: true }
            }) : null;

            return {
                telefone: c.telefone,
                phone,
                name: manual?.name || cuidador?.nome || paciente?.nome || phone,
                type: manual ? 'manual' : cuidador ? 'cuidador' : paciente ? 'paciente' : 'unknown',
                entityId: cuidador?.id || paciente?.id || null,
                entityStatus: cuidador?.status || paciente?.status || null,
                totalMessages: c._count.id,
                messagesIn: inCount,
                messagesOut: outCount,
                lastMessage: c._max.timestamp,
                jid: manual?.jid || c.telefone,
            };
        }));

        // Inclui contatos manuais sem mensagens
        const phonesWithMessages = new Set(contacts.map((c) => (c.phone || '').replace(/\D/g, '')));
        const manualWithoutMessages = manualContacts
            .filter((c) => !phonesWithMessages.has(c.phone.replace(/\D/g, '')))
            .map((c) => ({
                telefone: c.jid || `${c.phone}@s.whatsapp.net`,
                phone: c.phone,
                name: c.name || c.phone,
                type: 'manual',
                entityId: null,
                entityStatus: null,
                totalMessages: 0,
                messagesIn: 0,
                messagesOut: 0,
                lastMessage: c.lastMessage || c.updatedAt,
                jid: c.jid || `${c.phone}@s.whatsapp.net`,
            }));

        const mergedContacts = dedupeContacts([...contacts, ...manualWithoutMessages]);
        const filtered = type && type !== 'all'
            ? mergedContacts.filter((c) => c.type === type)
            : mergedContacts;

        return NextResponse.json({ success: true, contacts: filtered });
    } catch (error) {
        await logger.error('contacts_get_error', 'Erro ao carregar contatos', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, contacts: [], error: 'Erro ao carregar contatos' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const body = await request.json();
        const rawPhone = String(body?.phone || body?.telefone || '').trim();
        const name = body?.name ? String(body.name).trim() : null;

        const phone = rawPhone.replace(/\D/g, '');
        if (!phone || phone.length < 10) {
            return NextResponse.json({ success: false, error: 'Telefone inválido' }, { status: 400 });
        }

        const jid = body?.jid
            ? String(body.jid)
            : `${phone}@s.whatsapp.net`;

        const contact = await prisma.whatsAppContact.upsert({
            where: { phone },
            update: {
                name,
                jid,
                lastMessage: new Date(),
            },
            create: {
                phone,
                name,
                jid,
                lastMessage: new Date(),
            },
        });

        return NextResponse.json({ success: true, contact });
    } catch (error) {
        await logger.error('contacts_post_error', 'Erro ao criar contato', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao criar contato' }, { status: 500 });
    }
}
