#!/usr/bin/env tsx
import { loadEnv } from '../env-loader';
loadEnv();

import { initializeWhatsApp, sendMessage, sendButtons, sendList, sendTemplateButtons } from './client';
import http from 'http';
import net from 'net';
import { writeFileSync } from 'fs';

// ============================================
// FUNÇÃO PARA ENCONTRAR PORTA DISPONÍVEL
// ============================================
async function findAvailablePort(startPort: number): Promise<number> {
    return new Promise((resolve, reject) => {
        const tryPort = (port: number) => {
            if (port > startPort + 20) {
                reject(new Error('Nenhuma porta disponível encontrada'));
                return;
            }

            const tester = net.createServer();

            tester.once('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`⚠️ Porta ${port} em uso, tentando ${port + 1}...`);
                    tryPort(port + 1);
                } else {
                    reject(err);
                }
            });

            tester.once('listening', () => {
                tester.close();
                resolve(port);
            });

            tester.listen(port, '127.0.0.1');
        };

        tryPort(startPort);
    });
}

async function startWhatsAppServer() {
    console.log('🚀 Iniciando servidor WhatsApp...');

    try {
        // Encontrar porta disponível
        const PORT = await findAvailablePort(parseInt(process.env.WA_BRIDGE_PORT || '4000', 10));

        // Salvar porta para que o Next.js saiba qual usar
        writeFileSync('.wa-bridge-port', PORT.toString());
        console.log(`✅ Porta ${PORT} disponível. Salvando em .wa-bridge-port`);

        await initializeWhatsApp();
        console.log('✅ Servidor WhatsApp rodando!');
        console.log('📱 Escaneie o QR Code no terminal');

        // Servidor HTTP para Bridge de Comandos do Admin
        const server = http.createServer(async (req, res) => {
            // CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            // Status check
            if (req.url === '/status' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'RUNNING',
                    connected: true,
                    port: PORT,
                    timestamp: new Date().toISOString()
                }));
                return;
            }

            // Enviar mensagem de texto
            if (req.url === '/send' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const { phone, message, to } = JSON.parse(body);
                        const targetPhone = to || phone;

                        if (!targetPhone || !message) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Phone and message required' }));
                            return;
                        }

                        let jid = targetPhone;
                        if (!jid.includes('@')) {
                            jid = `${targetPhone.replace(/\D/g, '')}@s.whatsapp.net`;
                        }

                        console.log(`📤 [Bridge] Enviando para ${jid}...`);
                        const result = await sendMessage(jid.split('@')[0], message);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            messageId: result?.messageId,
                            timestamp: new Date().toISOString()
                        }));
                    } catch (e: any) {
                        console.error('❌ [Bridge] Erro:', e);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: e.message || 'Internal Error' }));
                    }
                });
                return;
            }

            // Enviar mensagem com BOTÕES
            if (req.url === '/send-buttons' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const { phone, to, text, buttons, footer } = JSON.parse(body);
                        const targetPhone = to || phone;

                        if (!targetPhone || !text || !buttons?.length) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Phone, text, and buttons required' }));
                            return;
                        }

                        console.log(`📤 [Bridge] Enviando botões para ${targetPhone}...`);
                        const result = await sendButtons(targetPhone, text, buttons, footer);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(result));
                    } catch (e: any) {
                        console.error('❌ [Bridge] Erro ao enviar botões:', e);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: e.message }));
                    }
                });
                return;
            }

            // Enviar mensagem com LISTA
            if (req.url === '/send-list' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const { phone, to, text, buttonText, sections, footer } = JSON.parse(body);
                        const targetPhone = to || phone;

                        if (!targetPhone || !text || !sections?.length) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Phone, text, and sections required' }));
                            return;
                        }

                        console.log(`📤 [Bridge] Enviando lista para ${targetPhone}...`);
                        const result = await sendList(targetPhone, text, buttonText || 'Ver opções', sections, footer);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(result));
                    } catch (e: any) {
                        console.error('❌ [Bridge] Erro ao enviar lista:', e);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: e.message }));
                    }
                });
                return;
            }

            // Enviar Template Buttons (URL, Call, QuickReply)
            if (req.url === '/send-template' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const { phone, to, text, templateButtons, footer } = JSON.parse(body);
                        const targetPhone = to || phone;

                        if (!targetPhone || !text || !templateButtons?.length) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Phone, text, and templateButtons required' }));
                            return;
                        }

                        console.log(`📤 [Bridge] Enviando template para ${targetPhone}...`);
                        const result = await sendTemplateButtons(targetPhone, text, templateButtons, footer);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(result));
                    } catch (e: any) {
                        console.error('❌ [Bridge] Erro ao enviar template:', e);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: e.message }));
                    }
                });
                return;
            }

            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not Found' }));
        });

        server.on('error', (e: any) => {
            console.error('❌ Erro no servidor HTTP:', e);
        });

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🌐 Bridge HTTP rodando em http://localhost:${PORT}`);
            console.log(`📋 Endpoints:`);
            console.log(`   GET  /status - Status da conexão`);
            console.log(`   POST /send   - Enviar mensagem`);
        });

    } catch (error) {
        console.error('❌ Erro ao iniciar WhatsApp:', error);
        process.exit(1);
    }
}

startWhatsAppServer();
