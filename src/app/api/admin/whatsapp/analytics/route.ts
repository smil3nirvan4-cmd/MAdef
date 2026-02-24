import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_ANALYTICS');
    if (guard instanceof NextResponse) return guard;

    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '7d';

        const days = period === '90d' ? 90 : period === '30d' ? 30 : period === '24h' ? 1 : 7;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Messages stats
        const messagesIn = await prisma.mensagem.count({ where: { timestamp: { gte: startDate }, direcao: 'IN' } });
        const messagesOut = await prisma.mensagem.count({ where: { timestamp: { gte: startDate }, direcao: 'OUT' } });

        // Messages by day
        const messagesByDay = await prisma.$queryRaw`
            SELECT
                DATE(timestamp) as date,
                SUM(CASE WHEN direcao = 'IN' THEN 1 ELSE 0 END) as inbound,
                SUM(CASE WHEN direcao = 'OUT' THEN 1 ELSE 0 END) as outbound
            FROM mensagem
            WHERE timestamp >= ${startDate}
            GROUP BY DATE(timestamp)
            ORDER BY date ASC
        ` as any[];

        // Messages by flow
        const messagesByFlow = await prisma.mensagem.groupBy({
            by: ['flow'],
            _count: true,
            where: { timestamp: { gte: startDate } },
        });

        // Response time (average time between IN and OUT for same phone)
        // Simplified: just count quick responses (< 5 min)
        const quickResponses = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM mensagem m1
            WHERE m1.direcao = 'OUT'
            AND m1.timestamp >= ${startDate}
            AND EXISTS (
                SELECT 1 FROM mensagem m2
                WHERE m2.telefone = m1.telefone
                AND m2.direcao = 'IN'
                AND m2.timestamp < m1.timestamp
                AND m2.timestamp > datetime(m1.timestamp, '-5 minutes')
            )
        ` as any[];

        // Unique contacts
        const uniqueContacts = await prisma.mensagem.groupBy({
            by: ['telefone'],
            where: { timestamp: { gte: startDate } },
        });

        // Flow conversions
        const flowStats = {
            triagemStarted: await prisma.whatsAppFlowState.count({ where: { currentFlow: { contains: 'TRIAGEM' } } }),
            completed: await prisma.cuidador.count({ where: { status: 'APROVADO', createdAt: { gte: startDate } } }),
        };

        // Peak hours
        const peakHours = await prisma.$queryRaw`
            SELECT
                strftime('%H', timestamp) as hour,
                COUNT(*) as count
            FROM mensagem
            WHERE timestamp >= ${startDate}
            GROUP BY strftime('%H', timestamp)
            ORDER BY count DESC
            LIMIT 5
        ` as any[];

        const safeMessagesByDay = messagesByDay.map((row: any) => ({
            date: row.date,
            inbound: Number(row.inbound || 0),
            outbound: Number(row.outbound || 0),
        }));

        const safePeakHours = peakHours.map((p: any) => ({
            hour: p.hour,
            count: Number(p.count || 0),
        }));

        const quickResponseCount = Number((quickResponses[0] as any)?.count || 0);

        return NextResponse.json({
            success: true,
            summary: {
                messagesIn,
                messagesOut,
                totalMessages: messagesIn + messagesOut,
                uniqueContacts: uniqueContacts.length,
                responseRate: messagesOut > 0 ? Math.round((messagesIn / messagesOut) * 100) : 0,
                quickResponseCount,
            },
            messagesByDay: safeMessagesByDay,
            messagesByFlow: messagesByFlow.map(f => ({ flow: f.flow || 'N/A', count: f._count })),
            flowStats,
            peakHours: safePeakHours,
            period,
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json({ success: false, error: 'Erro ao gerar analytics' }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
