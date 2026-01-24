# Mãos Amigas - Servidor WhatsApp

## ⚙️ Configuração

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env.local`:

```env
# Redis
REDIS_URL=redis://localhost:6379

# Next.js
NEXT_PUBLIC_URL=http://localhost:3000

# WhatsApp (opcional - para Evolution API)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your-api-key
```

### 3. Iniciar Redis (Docker)
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 4. Iniciar Servidor WhatsApp
```bash
npm run whatsapp
```

Escaneie o QR Code que aparecerá no terminal com o WhatsApp.

### 5. Iniciar Next.js (Em outro terminal)
```bash
npm run dev
```

## 📱 Testando

Envie uma mensagem para o número conectado:
```
Olá
```

O bot responderá com o menu de onboarding.

## 🔄 Fluxos Implementados

### ✅ Onboarding
- Welcome message
- Seleção: Paciente/Cuidador/Dúvidas

### ✅ Cadastro Cuidador
- Área de atuação
- Dados pessoais (Nome, CPF, Email)
- COREN (se aplicável)
- Cidade e bairros
- Link para questionário

### ✅ Oferta de Plantão (Modo Impositivo)
- Envio de oferta
- Aceite/Recusa
- Motivo da recusa

### ✅ Escolha de Slot (Modo Escolha)
- Broadcast de vagas
- Race condition handling (Redis locks)
- Confirmação de escolha

### 🚧 Em Desenvolvimento
- Aceite de orçamento
- Assinatura de contrato
- Check-in/Check-out plantão
- Monitoramento T-2h

## 📊 Estado do Sistema

Estados possíveis (`currentFlow`):
- `IDLE` - Aguardando comando
- `ONBOARDING` - Fluxo de boas-vindas
- `CADASTRO_CUIDADOR` - Cadastro de profissional
- `CADASTRO_PACIENTE` - Cadastro de paciente
- `OFERTA_PLANTAO` - Aguardando resposta de oferta
- `ESCOLHA_SLOT` - Escolhendo vaga disponível
- `AGUARDANDO_ACEITE_ORCAMENTO` - Decisão sobre orçamento
- `AGUARDANDO_ASSINATURA` - Aguardando assinar contrato
- `CHECKIN_PLANTAO` - Check-in pré-plantão

## 🔐 Redis Keys

- `whatsapp:state:{phone}` - Estado da conversa (TTL: 7 dias)
- `slot:lock:{slotId}` - Lock para race condition (TTL: 30s)
- `cooldown:teste:{cuidadorId}` - Cooldown retry teste (TTL: 5 min)

## 🛠️ Debugging

### Ver logs do WhatsApp
```bash
tail -f whatsapp.log
```

### Verificar estado de um número
```bash
redis-cli
> GET whatsapp:state:5511999999999
```

### Limpar estado
```bash
redis-cli
> DEL whatsapp:state:5511999999999
```

## 🚀 Próximas Implementações

1. **Scheduler (BullMQ)**
   - Lembretes de contrato
   - Check-in plantão
   - Retry de teste

2. **Templates de Mensagem**
   - Orçamento
   - Contrato
   - Briefing paciente

3. **Integração com Banco**
   - Salvar cuidadores
   - Salvar pacientes
   - Gerenciar plantões

4. **Dashboard Admin**
   - Visualizar conversas
   - Assumir urgências
   - Estatísticas

## 📄 Estrutura de Arquivos

```
src/
├── lib/
│   └── whatsapp/
│       ├── client.ts              # Baileys client
│       ├── server.ts              # Servidor standalone
│       ├── state-manager.ts       # Redis state
│       └── handlers/
│           ├── index.ts           # Router principal
│           ├── onboarding.ts      # Boas-vindas
│           ├── cadastro-cuidador.ts
│           ├── oferta-plantao.ts
│           └── escolha-slot.ts
├── app/api/
│   └── whatsapp/
│       └── webhook/route.ts       # Endpoint webhook
└── types/
    └── whatsapp.ts                # Types TypeScript
```
