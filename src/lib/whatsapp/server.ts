#!/usr/bin/env tsx
import { loadEnv } from '../env-loader';
loadEnv();

import { initializeWhatsApp, sendMessage, sendButtons, sendList, sendTemplateButtons } from './client';
import http from 'http';
import net from 'net';
import { writeFileSync } from 'fs';
import logger from '@/lib/observability/logger';

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
                    void logger.warning('wa_port_in_use', `Porta ${port} em uso, tentando ${port + 1}...`, { port, nextPort: port + 1 });
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
    void logger.whatsapp('wa_server_starting', 'Iniciando servidor WhatsApp...');

    try {
        // Encontrar porta disponível
        const PORT = await findAvailablePort(parseInt(process.env.WA_BRIDGE_PORT || '4000', 10));

        // Salvar porta para que o Next.js saiba qual usar
        writeFileSync('.wa-bridge-port', PORT.toString());
        void logger.info('wa_port_found', `Porta ${PORT} disponível. Salvando em .wa-bridge-port`, { port: PORT });

        await initializeWhatsApp();
        void logger.whatsapp('wa_server_started', 'Servidor WhatsApp rodando!');
        void logger.info('wa_qr_code_prompt', 'Escaneie o QR Code no terminal');

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

                        void logger.whatsapp('wa_bridge_send', `Enviando mensagem para ${jid}`, { jid });
                        const result = await sendMessage(jid.split('@')[0], message);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            timestamp: new Date().toISOString()
                        }));
                    } catch (e: any) {
                        void logger.error('wa_bridge_send_error', 'Erro ao enviar mensagem via Bridge', e instanceof Error ? e : undefined);
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

                        void logger.whatsapp('wa_bridge_send_buttons', `Enviando botões para ${targetPhone}`, { phone: targetPhone });
                        const result = await sendButtons(targetPhone, text, buttons, footer);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(result));
                    } catch (e: any) {
                        void logger.error('wa_bridge_send_buttons_error', 'Erro ao enviar botões via Bridge', e instanceof Error ? e : undefined);
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

                        void logger.whatsapp('wa_bridge_send_list', `Enviando lista para ${targetPhone}`, { phone: targetPhone });
                        const result = await sendList(targetPhone, text, buttonText || 'Ver opções', sections, footer);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(result));
                    } catch (e: any) {
                        void logger.error('wa_bridge_send_list_error', 'Erro ao enviar lista via Bridge', e instanceof Error ? e : undefined);
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

                        void logger.whatsapp('wa_bridge_send_template', `Enviando template para ${targetPhone}`, { phone: targetPhone });
                        const result = await sendTemplateButtons(targetPhone, text, templateButtons, footer);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(result));
                    } catch (e: any) {
                        void logger.error('wa_bridge_send_template_error', 'Erro ao enviar template via Bridge', e instanceof Error ? e : undefined);
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
            void logger.error('wa_http_server_error', 'Erro no servidor HTTP', e instanceof Error ? e : undefined);
        });

        server.listen(PORT, '0.0.0.0', () => {
            void logger.whatsapp('wa_bridge_http_started', `Bridge HTTP rodando em http://localhost:${PORT}`, { port: PORT });
            void logger.info('wa_bridge_endpoints', 'Endpoints disponíveis: GET /status, POST /send, POST /send-buttons, POST /send-list, POST /send-template', { port: PORT });
        });

    } catch (error) {
        void logger.error('wa_server_start_error', 'Erro ao iniciar WhatsApp', error instanceof Error ? error : undefined);
        process.exit(1);
    }
}

startWhatsAppServer();
