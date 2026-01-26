# 🏥 Jornada do Cliente: Do Contato ao Contrato

Este documento detalha o fluxo completo automatizado e manual para a contratação de cuidados.

## 🔄 Diagrama de Fluxo

```mermaid
sequenceDiagram
    participant C as Cliente (WhatsApp)
    participant B as Bot (Mãos Amigas)
    participant A as Admin/Equipe (Dashboard)
    
    Note over C,B: 1. Contato Inicial & Triagem
    C->>B: "Olá, preciso de cuidador"
    B->>C: Coleta Nome, Local e Necessidade
    C->>B: Informa dados (Ex: Pós-op, 12h/dia)
    B->>A: Salva pré-cadastro (Status: AGUARDANDO_AVALIACAO)
    B->>C: "Aguarde contato da equipe"

    Note over A,C: 2. Avaliação & Orçamento
    A->>C: Contato Humano (Tel/Zap) para agendar visita
    A->>A: Realiza visita e cria Plano de Cuidado
    A->>A: Gera Orçamento no Sistema
    A->>B: Dispara Orçamento via Bot (Futuro)
    B->>C: "Seu Orçamento: R$ X. Aceita?"
    
    Note over C,B: 3. Fechamento
    C->>B: "ACEITO"
    B->>C: Envia Contrato Digital (Termos)
    C->>B: "CONCORDO"
    B->>C: Envia Chave PIX/Boleto
    B->>A: Notifica Fechamento (Status: CONTRATO_ASSINADO)
    
    Note over A,C: 4. Início
    A->>A: Aloca Profissionais
    A->>C: Início do Atendimento
```

## 📝 Detalhamento das Etapas

### 1. Triagem Automática (Bot)
- **Objetivo:** Qualificar o lead e entender a urgência.
- **Dados Coletados:** Nome, Localização, Tipo de Paciente (Idoso, Pós-Op), Carga Horária.
- **Resultado:** Lead salvo no sistema como `AGUARDANDO_AVALIACAO`.
- **Ação Humana:** Nenhuma necessária neste momento.

### 2. Avaliação Técnica (Humana)
- **Status:** `AGUARDANDO_AVALIACAO`
- **Ação:** Enfermeira responsável acessa o Painel Admin, vê o lead e entra em contato.
- **Visita:** Avaliação presencial do paciente para definir complexidade.

### 3. Negociação (Híbrido)
- **Ação:** Admin cria o orçamento no sistema.
- **Envio:** O Admin pode enviar o PDF por email ou o Bot pode enviar um resumo.
- **Interação:** O Cliente pode ACEITAR ou RECUSAR via WhatsApp.
    - Se RECUSAR: Bot pergunta motivo e notifica consultor.
    - Se ACEITAR: Bot avança para contrato.

### 4. Assinatura Digital (Bot)
- **Status:** `AGUARDANDO_ASSINATURA`
- **Fluxo:** O Bot apresenta os termos legais resumidos.
- **Validade:** O "CONCORDO" via WhatsApp, atrelado ao número de telefone verificado, tem validade jurídica como aceite eletrônico em muitos contextos (similar a email).
- **Resultado:** Status muda para `AGUARDANDO_PAGAMENTO`.

## 🚀 Próximos Passos de Desenvolvimento
Para fechar o ciclo 100% via sistema, precisamos implementar:
1. **Botão "Enviar Orçamento" no Admin:** Que dispara a mensagem de template para o cliente aceitar.
2. **Integração PIX:** Para o bot gerar o QR Code automaticamente após a assinatura.
