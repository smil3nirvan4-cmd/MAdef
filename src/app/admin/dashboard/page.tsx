'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import {
    UserCheck,
    ClipboardList,
    Calendar,
    Phone,
    FileText,
    Users,
    MessageCircle,
    ArrowRight,
    Loader2,
    Sparkles
} from 'lucide-react';

interface DashboardStats {
    candidatosPendentes: number;
    avaliacoesHoje: number;
    pacientesAtivos: number;
    mensagens24h: number;
    cuidadoresAprovados: number;
    avaliacoesPendentes: number;
}

const menuCards = [
    {
        title: 'Candidatos & RH',
        description: 'Aprovar cuidadores reprovados na triagem ou aguardando entrevista.',
        href: '/admin/candidatos',
        icon: UserCheck,
        color: 'purple' as const,
    },
    {
        title: 'Avaliações de Pacientes',
        description: 'Validar urgências, calcular orçamentos e definir planos.',
        href: '/admin/avaliacoes',
        icon: ClipboardList,
        color: 'blue' as const,
    },
    {
        title: 'Escalas & Alocação',
        description: 'Gestão de slots e monitoramento de plantões.',
        href: '/admin/alocacao',
        icon: Calendar,
        color: 'green' as const,
    },
    {
        title: 'Conexão WhatsApp',
        description: 'Scanear QR Code e monitorar status da conexão.',
        href: '/admin/whatsapp',
        icon: Phone,
        color: 'orange' as const,
    },
    {
        title: 'Triagens WhatsApp',
        description: 'Ver dados capturados pelo bot em tempo real.',
        href: '/admin/triagens',
        icon: FileText,
        color: 'purple' as const,
    },
    {
        title: 'Usuários & Mensagens',
        description: 'Histórico de pacientes, cuidadores e conversas.',
        href: '/admin/usuarios',
        icon: Users,
        color: 'blue' as const,
    },
];

const colorStyles = {
    purple: { bg: 'bg-primary-50', icon: 'text-primary-600', hover: 'group-hover:bg-primary-100', title: 'text-primary-700' },
    blue: { bg: 'bg-info-50', icon: 'text-info-600', hover: 'group-hover:bg-info-100', title: 'text-info-700' },
    green: { bg: 'bg-secondary-50', icon: 'text-secondary-600', hover: 'group-hover:bg-secondary-100', title: 'text-secondary-700' },
    orange: { bg: 'bg-accent-50', icon: 'text-accent-600', hover: 'group-hover:bg-accent-100', title: 'text-accent-700' },
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/admin/dashboard/stats');
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        // Refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const statCards = [
        {
            label: 'Candidatos Pendentes',
            value: stats?.candidatosPendentes ?? 0,
            icon: UserCheck,
            color: 'purple',
            href: '/admin/candidatos',
        },
        {
            label: 'Avaliações Hoje',
            value: stats?.avaliacoesHoje ?? 0,
            icon: ClipboardList,
            color: 'blue',
            href: '/admin/avaliacoes',
        },
        {
            label: 'Pacientes Ativos',
            value: stats?.pacientesAtivos ?? 0,
            icon: Users,
            color: 'green',
            href: '/admin/usuarios?tipo=PACIENTE',
        },
        {
            label: 'Mensagens (24h)',
            value: stats?.mensagens24h ?? 0,
            icon: MessageCircle,
            color: 'orange',
            href: '/admin/logs?type=WHATSAPP',
        },
    ];

    return (
        <div className="p-6 lg:p-8">
            {/* Hero Header */}
            <div className="mb-8 rounded-2xl bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 p-6 lg:p-8 text-primary-foreground shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWNkgyVjRoMzR6TTIgMzRoMzR2Mkgydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-400/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 opacity-80" />
                        <span className="text-sm font-medium opacity-80">
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Painel Administrativo</h1>
                    <p className="mt-1 text-sm opacity-90">Gerencie candidatos, avaliações, escalas e comunicação via WhatsApp.</p>
                </div>
            </div>

            {/* Stats Row - Clickable */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((stat) => {
                    const colors = colorStyles[stat.color as keyof typeof colorStyles];
                    return (
                        <Link key={stat.label} href={stat.href} className="group block outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all">
                            <Card className="h-full rounded-xl border border-border hover:border-primary-200 hover:shadow-md active:scale-[0.98] transition-all duration-200">
                                <div className="p-4 lg:p-5 flex flex-col h-full justify-between gap-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground line-clamp-1">{stat.label}</p>
                                            {loading ? (
                                                <div className="skeleton h-8 w-16 mt-2" />
                                            ) : (
                                                <h3 className="text-2xl font-bold text-foreground mt-1 tabular-nums">{stat.value}</h3>
                                            )}
                                        </div>
                                        <div className={`p-2.5 rounded-lg ${colors.bg} ${colors.hover} transition-colors`}>
                                            <stat.icon className={`w-5 h-5 ${colors.icon}`} />
                                        </div>
                                    </div>
                                    <div className="flex items-center text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors mt-auto">
                                        <span>Ver detalhes</span>
                                        <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            {/* Menu Cards */}
            <h2 className="text-lg font-semibold text-foreground mb-4 px-1">Módulos do Sistema</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {menuCards.map((card) => {
                    const colors = colorStyles[card.color];
                    return (
                        <Link key={card.href} href={card.href} className="group block outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all">
                            <Card className="h-full rounded-xl p-5 border border-border hover:border-primary-200 hover:shadow-md active:scale-[0.98] transition-all duration-200">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl transition-colors ${colors.bg} ${colors.hover}`}>
                                        <card.icon className={`w-6 h-6 ${colors.icon}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-semibold text-[15px] mb-1 ${colors.title}`}>
                                            {card.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {card.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                                </div>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
