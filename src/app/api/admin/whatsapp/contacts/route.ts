import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const type = searchParams.get('type'); // cuidador, paciente, all

        // Get unique contacts from messages using Prisma's proper aggregation
        const rawContacts = await prisma.mensagem.groupBy({
            by: ['telefone'],
            _count: { id: true },
            _max: { timestamp: true },
            orderBy: { _max: { timestamp: 'desc' } },
            take: 200,
            where: search ? { telefone: { contains: search } } : undefined,
        });

        // Get message direction counts separately
        const contacts = await Promise.all(rawContacts.map(async (c) => {
            const phone = c.telefone?.replace('@s.whatsapp.net', '').replace('@lid', '');

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
                name: cuidador?.nome || paciente?.nome || phone,
                type: cuidador ? 'cuidador' : paciente ? 'paciente' : 'unknown',
                entityId: cuidador?.id || paciente?.id,
                entityStatus: cuidador?.status || paciente?.status,
                totalMessages: c._count.id,
                messagesIn: inCount,
                messagesOut: outCount,
                lastMessage: c._max.timestamp,
            };
        }));

        const filtered = type && type !== 'all'
            ? contacts.filter((c) => c.type === type)
            : contacts;

        return NextResponse.json({ contacts: filtered });
    } catch (error) {
        console.error('Contacts API Error:', error);
        return NextResponse.json({ contacts: [], error: String(error) }, { status: 200 });
    }
}
