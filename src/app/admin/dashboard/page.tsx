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
    Loader2
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
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', hover: 'group-hover:bg-purple-100', title: 'text-purple-700' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', hover: 'group-hover:bg-blue-100', title: 'text-blue-700' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', hover: 'group-hover:bg-green-100', title: 'text-green-700' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', hover: 'group-hover:bg-orange-100', title: 'text-orange-700' },
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
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Painel Administrativo</h1>
                <p className="text-gray-500 mt-1">Gerencie candidatos, avaliações, escalas e comunicação via WhatsApp.</p>
            </div>

            {/* Stats Row - Clickable */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((stat) => {
                    const colors = colorStyles[stat.color as keyof typeof colorStyles];
                    return (
                        <Link key={stat.label} href={stat.href} className="group">
                            <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-2" />
                                        ) : (
                                            <h3 className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</h3>
                                        )}
                                    </div>
                                    <div className={`p-3 rounded-xl ${colors.bg} ${colors.hover} transition-colors`}>
                                        <stat.icon className={`w-6 h-6 ${colors.icon}`} />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center text-xs text-gray-400 group-hover:text-blue-600 transition-colors">
                                    <span>Ver detalhes</span>
                                    <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            {/* Menu Cards */}
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Módulos do Sistema</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {menuCards.map((card) => {
                    const colors = colorStyles[card.color];
                    return (
                        <Link key={card.href} href={card.href} className="group">
                            <Card className="h-full hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl transition-colors ${colors.bg} ${colors.hover}`}>
                                        <card.icon className={`w-6 h-6 ${colors.icon}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-semibold text-lg mb-1 ${colors.title}`}>
                                            {card.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 leading-relaxed">
                                            {card.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                </div>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
