'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutGrid,
    Users,
    ClipboardList,
    Calendar,
    MessageSquare,
    FileText,
    Phone,
    UserCheck,
    ChevronLeft,
    Menu,
    X,
    DollarSign,
    Heart,
    UserCog,
    UserPlus
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutGrid },
    { label: 'Candidatos', href: '/admin/candidatos', icon: UserCheck },
    { label: 'Cuidadores', href: '/admin/cuidadores', icon: UserCog },
    { label: 'Leads', href: '/admin/leads', icon: UserPlus },
    { label: 'Pacientes', href: '/admin/pacientes', icon: Heart },
    { label: 'Avaliações', href: '/admin/avaliacoes', icon: ClipboardList },
    { label: 'Orçamentos', href: '/admin/orcamentos', icon: DollarSign },
    { label: 'Escalas', href: '/admin/alocacao', icon: Calendar },
    { label: 'Usuários', href: '/admin/usuarios', icon: Users },
    { label: 'Triagens', href: '/admin/triagens', icon: FileText },
    { label: 'WhatsApp', href: '/admin/whatsapp', icon: Phone },
    { label: 'Logs', href: '/admin/logs', icon: MessageSquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <span className="font-semibold text-gray-900">Mãos Amigas</span>
                <div className="w-9" />
            </header>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out",
                "lg:translate-x-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100">
                    <Link href="/admin/dashboard" className="flex items-center gap-2">
                        <span className="text-xl">🤝</span>
                        <span className="font-bold text-gray-900">Mãos Amigas</span>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1 rounded hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="p-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Voltar ao Site
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className={cn(
                "min-h-screen transition-all duration-200",
                "lg:ml-64",
                "pt-14 lg:pt-0"
            )}>
                {children}
            </main>
        </div>
    );
}
