# Plano de Implementação: Fluxo Avançado de Avaliação e Proposta

## Objetivo
Implementar personalização completa da proposta comercial na tela de Avaliação e automatizar o envio multicanal (WhatsApp/Email) com link de aceite e assinatura digital.

## Mudanças Propostas

### 1. Comunicação Next.js ↔ WhatsApp Bot
Atualmente o bot e o Next.js são processos isolados. Para o Next.js disparar mensagens, criaremos uma "ponte" HTTP.

- **[MODIFY] `src/lib/whatsapp/server.ts`**: Adicionar servidor HTTP leve na porta 4000.
  - Endpoint `POST /send`: Recebe telefone e mensagem e dispara pelo socket.

### 2. Frontend de Avaliação (`/admin/avaliacoes/nova`)
- **[MODIFY] `src/app/admin/avaliacoes/nova/page.tsx`**:
  - Adicionar Step "Proposta Comercial" (pós ABEMID/Cálculo).
  - Campos editáveis: Valor Total, Entrada, Parcelas, Descontos, Acréscimos.
  - Botão "Enviar Proposta e Contrato".

### 3. API de Envio
- **[NEW] `src/app/api/propostas/enviar/route.ts`**:
  - Recebe os dados da proposta editada.
  - Salva no banco (mock).
  - Gera Link de Assinatura (já temos o serviço mock).
  - Dispara mensagem via Bot (porta 4000).
  - Simula envio de Email.

## Plano de Verificação

### Teste de Envio
1. Rodar `npm run whatsapp`.
2. Rodar `npm run dev`.
3. Curl para testar bridge: `curl -X POST http://localhost:4000/send -d '{"phone": "55...", "message": "teste"}'`.
4. Preencher avaliação no Admin.
5. Checar se mensagem chega no WhatsApp com link de assinatura.

### Teste de Assinatura
1. Clicar no link recebido.
2. Responder JÁ ASSINEI.
3. Verificar status validado.

## Impacto
O avaliador terá controle total sobre os valores antes de enviar, e o cliente terá uma experiência fluida de recebimento e aceite.
