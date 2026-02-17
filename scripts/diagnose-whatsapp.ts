import { readFileSync, existsSync } from 'fs';

async function diagnose() {
    console.log('DIAGNOSTICO WHATSAPP\n');
    console.log('='.repeat(50));

    console.log('\n1) Verificando arquivo de porta...');
    let savedPort: string | null = null;
    if (existsSync('.wa-bridge-port')) {
        savedPort = readFileSync('.wa-bridge-port', 'utf-8').trim();
        console.log(`   OK - Porta: ${savedPort}`);
    } else {
        console.log('   ERRO - Arquivo .wa-bridge-port nao encontrado');
        console.log('   -> Comando: npm run dev');
    }

    console.log('\n2) Testando conexao com a bridge...');

    const ports = savedPort ? [parseInt(savedPort, 10), 4000, 4001, 4002] : [4000, 4001, 4002, 4003];
    let foundPort: number | null = null;

    for (const port of ports) {
        try {
            const response = await fetch(`http://localhost:${port}/status`, {
                signal: AbortSignal.timeout(2000),
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`   OK - Bridge encontrada na porta ${port}`);
                console.log(`   -> Status: ${data.status}`);
                console.log(`   -> Conectado: ${data.connected ? 'SIM' : 'NAO'}`);
                foundPort = port;
                break;
            }
        } catch {
            console.log(`   - Porta ${port}: sem resposta`);
        }
    }

    if (!foundPort) {
        console.log('\n   ERRO - Nenhuma bridge encontrada');
        console.log('   -> Solucao: comando "npm run dev"');
    }

    console.log('\n3) Verificando sessao WhatsApp...');
    if (existsSync('.wa-session.json')) {
        try {
            const session = JSON.parse(readFileSync('.wa-session.json', 'utf-8'));
            console.log(`   OK - Sessao: ${session.status || 'desconhecido'}`);
        } catch {
            console.log('   ALERTA - Arquivo de sessao corrompido');
        }
    } else {
        console.log('   ALERTA - Nenhuma sessao salva. QR sera necessario.');
    }

    console.log('\n' + '='.repeat(50));
    if (foundPort) {
        console.log(`OK - BRIDGE ONLINE em http://localhost:${foundPort}`);
        console.log('\nTeste de envio:');
        console.log(`curl -X POST http://localhost:${foundPort}/send \\`);
        console.log('  -H "Content-Type: application/json" \\');
        console.log('  -d "{\\"to\\":\\"5511999999999\\",\\"message\\":\\"Teste\\"}"');
    } else {
        console.log('ERRO - BRIDGE OFFLINE');
        console.log('\nPara corrigir:');
        console.log('1. Abra outro terminal');
        console.log('2. Comando: npm run dev');
        console.log('3. Escaneie o QR Code com o celular');
    }
    console.log('\n');
}

diagnose().catch(console.error);
