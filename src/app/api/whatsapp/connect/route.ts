import { NextResponse } from 'next/server';
import { initializeWhatsApp } from '@/lib/whatsapp/client';

export async function POST() {
    try {
        await initializeWhatsApp();
        return NextResponse.json({ success: true, message: 'Iniciando conexão...' });
    } catch (error) {
        console.error('Error connecting WhatsApp:', error);
        return NextResponse.json({ success: false, error: 'Erro ao conectar' }, { status: 500 });
    }
}
