import { readFileSync, existsSync } from 'fs';

async function diagnose() {
    console.log('🔍 DIAGNÓSTICO WHATSAPP\n');
    console.log('='.repeat(50));

    // 1. Verificar arquivo de porta
    console.log('\n1️⃣ Verificando arquivo de porta...');
    let savedPort: string | null = null;
    if (existsSync('.wa-bridge-port')) {
        savedPort = readFileSync('.wa-bridge-port', 'utf-8').trim();
        console.log(`   ✅ Arquivo encontrado. Porta: ${savedPort}`);
    } else {
        console.log('   ❌ Arquivo .wa-bridge-port NÃO encontrado');
        console.log('   → Execute: npm run dev');
    }

    // 2. Testar conexão com a bridge
    console.log('\n2️⃣ Testando conexão com a bridge...');

    const ports = savedPort ? [parseInt(savedPort), 4000, 4001, 4002] : [4000, 4001, 4002, 4003];
    let foundPort: number | null = null;

    for (const port of ports) {
        try {
            const response = await fetch(`http://localhost:${port}/status`, {
                signal: AbortSignal.timeout(2000),
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`   ✅ Bridge encontrada na porta ${port}`);
                console.log(`   → Status: ${data.status}`);
                console.log(`   → Conectado: ${data.connected ? 'SIM' : 'NÃO'}`);
                foundPort = port;
                break;
            }
        } catch {
            console.log(`   ⚪ Porta ${port}: não responde`);
        }
    }

    if (!foundPort) {
        console.log('\n   ❌ NENHUMA BRIDGE ENCONTRADA!');
        console.log('   → Solução: Execute "npm run dev"');
    }

    // 3. Verificar sessão salva
    console.log('\n3️⃣ Verificando sessão WhatsApp...');
    if (existsSync('.wa-session.json')) {
        try {
            const session = JSON.parse(readFileSync('.wa-session.json', 'utf-8'));
            console.log(`   ✅ Sessão encontrada: ${session.status || 'desconhecido'}`);
        } catch {
            console.log('   ⚠️ Arquivo de sessão corrompido');
        }
    } else {
        console.log('   ⚠️ Nenhuma sessão salva. QR Code será necessário.');
    }

    // 4. Resumo
    console.log('\n' + '='.repeat(50));
    if (foundPort) {
        console.log(`✅ BRIDGE ONLINE em http://localhost:${foundPort}`);
        console.log('\n📋 Teste de envio:');
        console.log(`curl -X POST http://localhost:${foundPort}/send \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{"to":"5511999999999","message":"Teste"}'`);
    } else {
        console.log('❌ BRIDGE OFFLINE');
        console.log('\n📋 Para corrigir:');
        console.log('1. Abra outro terminal');
        console.log('2. Execute: npm run dev');
        console.log('3. Escaneie o QR Code com o celular');
    }
    console.log('\n');
}

diagnose().catch(console.error);
