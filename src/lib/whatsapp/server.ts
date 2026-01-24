#!/usr/bin/env tsx
import { initializeWhatsApp } from './client';

async function startWhatsAppServer() {
    console.log('🚀 Iniciando servidor WhatsApp...');

    try {
        await initializeWhatsApp();
        console.log('✅ Servidor WhatsApp rodando!');
        console.log('📱 Escaneie o QR Code no terminal');
    } catch (error) {
        console.error('❌ Erro ao iniciar WhatsApp:', error);
        process.exit(1);
    }
}

startWhatsAppServer();
