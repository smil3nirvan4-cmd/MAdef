-- CreateTable
CREATE TABLE "Cuidador" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "area" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CRIADO',
    "quizScore" INTEGER,
    "scoreRH" INTEGER,
    "competencias" TEXT,
    "endereco" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cuidador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "cidade" TEXT,
    "bairro" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'HOME_CARE',
    "hospital" TEXT,
    "quarto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'LEAD',
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "gqpScore" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "direcao" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "flow" TEXT,
    "step" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cuidadorId" TEXT,
    "pacienteId" TEXT,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "abemidScore" INTEGER,
    "katzScore" INTEGER,
    "lawtonScore" INTEGER,
    "gqp" INTEGER,
    "nivelSugerido" TEXT,
    "cargaSugerida" TEXT,
    "nivelFinal" TEXT,
    "cargaFinal" TEXT,
    "avaliadorId" TEXT,
    "validadoEm" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dadosDetalhados" TEXT,
    "whatsappEnviado" BOOLEAN NOT NULL DEFAULT false,
    "whatsappEnviadoEm" TIMESTAMP(3),
    "whatsappMessageId" TEXT,
    "whatsappErro" TEXT,
    "whatsappTentativas" INTEGER NOT NULL DEFAULT 0,
    "valorProposto" TEXT,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "unidadeId" TEXT,
    "configVersionId" TEXT,
    "avaliacaoId" TEXT,
    "cenarioEconomico" TEXT,
    "cenarioRecomendado" TEXT,
    "cenarioPremium" TEXT,
    "cenarioSelecionado" TEXT,
    "valorFinal" DOUBLE PRECISION,
    "snapshotInput" TEXT,
    "snapshotOutput" TEXT,
    "planningInput" TEXT,
    "normalizedSchedule" TEXT,
    "pricingBreakdown" TEXT,
    "calculationHash" TEXT,
    "auditHash" TEXT,
    "engineVersion" TEXT,
    "createdBy" TEXT,
    "descontoManualPercent" DOUBLE PRECISION,
    "minicustosDesativados" TEXT,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "aprovadoPor" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "aceitoEm" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alocacao" (
    "id" TEXT NOT NULL,
    "cuidadorId" TEXT NOT NULL,
    "pacienteId" TEXT,
    "slotId" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "hospital" TEXT,
    "quarto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE_FEEDBACK',
    "ofertadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondidoEm" TIMESTAMP(3),
    "confirmadoT24" TIMESTAMP(3),
    "confirmadoT2" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alocacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dados" TEXT NOT NULL,
    "telefone" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSession" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "contactId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'MENU',
    "data" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "qrCode" TEXT,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastActivity" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppFlowState" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "currentFlow" TEXT NOT NULL DEFAULT 'IDLE',
    "currentStep" TEXT NOT NULL DEFAULT '',
    "data" TEXT NOT NULL,
    "lastInteraction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppFlowState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppLock" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppCooldown" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppCooldown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppContact" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "jid" TEXT,
    "profilePic" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "labels" TEXT,
    "lastMessage" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppQuickReply" (
    "id" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppQuickReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutoReply" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "condition" TEXT,
    "response" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAutoReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppScheduled" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppScheduled_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppQueueItem" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "internalMessageId" TEXT,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppLabel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppBlacklist" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppWebhook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Webhook',
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "secret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppFlowDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'geral',
    "description" TEXT,
    "definition" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppFlowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAnalytics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "messagesRecv" INTEGER NOT NULL DEFAULT 0,
    "uniqueContacts" INTEGER NOT NULL DEFAULT 0,
    "avgResponseMs" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT,
    "estado" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "parentUnidadeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeConfiguracaoVersao" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "nome" TEXT,
    "descricao" TEXT,
    "createdBy" TEXT,
    "baseCuidador12h" DOUBLE PRECISION NOT NULL,
    "baseAuxiliarEnf12h" DOUBLE PRECISION NOT NULL,
    "baseTecnicoEnf12h" DOUBLE PRECISION NOT NULL,
    "baseEnfermeiro12h" DOUBLE PRECISION,
    "margemPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lucroFixo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lucroFixoEscalaHoras" BOOLEAN NOT NULL DEFAULT false,
    "adicionalSegundoPacientePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adicionalNoturnoPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adicionalFimSemanaPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adicionalFeriadoPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adicionalAltoRiscoPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adicionalAtPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adicionalAaPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adicionalAtEscalaHoras" BOOLEAN NOT NULL DEFAULT true,
    "adicionalAaEscalaHoras" BOOLEAN NOT NULL DEFAULT true,
    "impostoSobreComissaoPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aplicarTaxaAntesDesconto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadeConfiguracaoVersao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeDoencaRegra" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "complexidade" TEXT NOT NULL,
    "profissionalMinimo" TEXT NOT NULL,
    "adicionalPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadeDoencaRegra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeRegraHora" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "hora" INTEGER NOT NULL,
    "fatorPercent" DOUBLE PRECISION NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadeRegraHora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeTaxaPagamento" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "taxaPercent" DOUBLE PRECISION NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadeTaxaPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeMinicusto" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "escalaHoras" BOOLEAN NOT NULL DEFAULT false,
    "ativoPadrao" BOOLEAN NOT NULL DEFAULT true,
    "opcionalNoFechamento" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadeMinicusto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadePercentualComissao" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadePercentualComissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeDescontoPreset" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "etiqueta" TEXT,
    "percentual" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadeDescontoPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeContratoTemplate" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "formato" TEXT NOT NULL DEFAULT 'MARKDOWN',
    "conteudo" TEXT NOT NULL,
    "placeholders" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "publicadoEm" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadeContratoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcamentoSimulacao" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "orcamentoId" TEXT,
    "pacienteId" TEXT,
    "avaliacaoId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ADMIN',
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "inputSnapshot" TEXT NOT NULL,
    "outputSnapshot" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION,
    "valorFinal" DOUBLE PRECISION,
    "descontoManualPercent" DOUBLE PRECISION,
    "descontoPresetNome" TEXT,
    "minicustosDesativados" TEXT,
    "inputHash" TEXT,
    "engineVersion" TEXT,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcamentoSimulacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigAuditLog" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "acao" TEXT NOT NULL,
    "beforeSnapshot" TEXT,
    "afterSnapshot" TEXT,
    "actorId" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcamentoAuditLog" (
    "id" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "configVersionId" TEXT,
    "acao" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "beforeSnapshot" TEXT,
    "afterSnapshot" TEXT,
    "diffSnapshot" TEXT,
    "inputHash" TEXT,
    "requestId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrcamentoAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "stack" TEXT,
    "userId" TEXT,
    "unidadeId" TEXT,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cuidador_telefone_key" ON "Cuidador"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_telefone_key" ON "Paciente"("telefone");

-- CreateIndex
CREATE INDEX "Orcamento_pacienteId_createdAt_idx" ON "Orcamento"("pacienteId", "createdAt");

-- CreateIndex
CREATE INDEX "Orcamento_unidadeId_createdAt_idx" ON "Orcamento"("unidadeId", "createdAt");

-- CreateIndex
CREATE INDEX "Orcamento_configVersionId_idx" ON "Orcamento"("configVersionId");

-- CreateIndex
CREATE INDEX "Orcamento_avaliacaoId_idx" ON "Orcamento"("avaliacaoId");

-- CreateIndex
CREATE INDEX "Orcamento_calculationHash_idx" ON "Orcamento"("calculationHash");

-- CreateIndex
CREATE INDEX "Orcamento_auditHash_idx" ON "Orcamento"("auditHash");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSession_phone_key" ON "WhatsAppSession"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSession_contactId_key" ON "WhatsAppSession"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppFlowState_phone_key" ON "WhatsAppFlowState"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppLock_resourceId_key" ON "WhatsAppLock"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppCooldown_key_key" ON "WhatsAppCooldown"("key");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppContact_phone_key" ON "WhatsAppContact"("phone");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_contactId_createdAt_idx" ON "WhatsAppMessage"("contactId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_name_key" ON "WhatsAppTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppQuickReply_shortcut_key" ON "WhatsAppQuickReply"("shortcut");

-- CreateIndex
CREATE INDEX "WhatsAppAutoReply_isActive_priority_idx" ON "WhatsAppAutoReply"("isActive", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppQueueItem_idempotencyKey_key" ON "WhatsAppQueueItem"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppQueueItem_internalMessageId_key" ON "WhatsAppQueueItem"("internalMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppQueueItem_status_scheduledAt_idx" ON "WhatsAppQueueItem"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "WhatsAppQueueItem_status_createdAt_idx" ON "WhatsAppQueueItem"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppLabel_name_key" ON "WhatsAppLabel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppBlacklist_phone_key" ON "WhatsAppBlacklist"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppFlowDefinition_name_category_key" ON "WhatsAppFlowDefinition"("name", "category");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSetting_key_key" ON "WhatsAppSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAnalytics_date_key" ON "WhatsAppAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Unidade_codigo_key" ON "Unidade"("codigo");

-- CreateIndex
CREATE INDEX "Unidade_ativa_idx" ON "Unidade"("ativa");

-- CreateIndex
CREATE INDEX "UnidadeConfiguracaoVersao_unidadeId_isActive_idx" ON "UnidadeConfiguracaoVersao"("unidadeId", "isActive");

-- CreateIndex
CREATE INDEX "UnidadeConfiguracaoVersao_unidadeId_isActive_effectiveFrom__idx" ON "UnidadeConfiguracaoVersao"("unidadeId", "isActive", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeConfiguracaoVersao_unidadeId_version_key" ON "UnidadeConfiguracaoVersao"("unidadeId", "version");

-- CreateIndex
CREATE INDEX "UnidadeDoencaRegra_unidadeId_ativa_idx" ON "UnidadeDoencaRegra"("unidadeId", "ativa");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeDoencaRegra_configVersionId_codigo_key" ON "UnidadeDoencaRegra"("configVersionId", "codigo");

-- CreateIndex
CREATE INDEX "UnidadeRegraHora_unidadeId_hora_idx" ON "UnidadeRegraHora"("unidadeId", "hora");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeRegraHora_configVersionId_hora_key" ON "UnidadeRegraHora"("configVersionId", "hora");

-- CreateIndex
CREATE INDEX "UnidadeTaxaPagamento_unidadeId_metodo_periodo_idx" ON "UnidadeTaxaPagamento"("unidadeId", "metodo", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeTaxaPagamento_configVersionId_metodo_periodo_key" ON "UnidadeTaxaPagamento"("configVersionId", "metodo", "periodo");

-- CreateIndex
CREATE INDEX "UnidadeMinicusto_unidadeId_tipo_idx" ON "UnidadeMinicusto"("unidadeId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeMinicusto_configVersionId_tipo_key" ON "UnidadeMinicusto"("configVersionId", "tipo");

-- CreateIndex
CREATE INDEX "UnidadePercentualComissao_unidadeId_tipo_idx" ON "UnidadePercentualComissao"("unidadeId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadePercentualComissao_configVersionId_tipo_key" ON "UnidadePercentualComissao"("configVersionId", "tipo");

-- CreateIndex
CREATE INDEX "UnidadeDescontoPreset_unidadeId_ativo_idx" ON "UnidadeDescontoPreset"("unidadeId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeDescontoPreset_configVersionId_nome_key" ON "UnidadeDescontoPreset"("configVersionId", "nome");

-- CreateIndex
CREATE INDEX "UnidadeContratoTemplate_unidadeId_tipo_ativo_idx" ON "UnidadeContratoTemplate"("unidadeId", "tipo", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeContratoTemplate_unidadeId_tipo_versao_key" ON "UnidadeContratoTemplate"("unidadeId", "tipo", "versao");

-- CreateIndex
CREATE INDEX "OrcamentoSimulacao_unidadeId_createdAt_idx" ON "OrcamentoSimulacao"("unidadeId", "createdAt");

-- CreateIndex
CREATE INDEX "OrcamentoSimulacao_configVersionId_createdAt_idx" ON "OrcamentoSimulacao"("configVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "OrcamentoSimulacao_orcamentoId_idx" ON "OrcamentoSimulacao"("orcamentoId");

-- CreateIndex
CREATE INDEX "OrcamentoSimulacao_pacienteId_idx" ON "OrcamentoSimulacao"("pacienteId");

-- CreateIndex
CREATE INDEX "OrcamentoSimulacao_avaliacaoId_idx" ON "OrcamentoSimulacao"("avaliacaoId");

-- CreateIndex
CREATE INDEX "ConfigAuditLog_unidadeId_createdAt_idx" ON "ConfigAuditLog"("unidadeId", "createdAt");

-- CreateIndex
CREATE INDEX "ConfigAuditLog_configVersionId_createdAt_idx" ON "ConfigAuditLog"("configVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "ConfigAuditLog_entidade_createdAt_idx" ON "ConfigAuditLog"("entidade", "createdAt");

-- CreateIndex
CREATE INDEX "ConfigAuditLog_requestId_idx" ON "ConfigAuditLog"("requestId");

-- CreateIndex
CREATE INDEX "OrcamentoAuditLog_orcamentoId_createdAt_idx" ON "OrcamentoAuditLog"("orcamentoId", "createdAt");

-- CreateIndex
CREATE INDEX "OrcamentoAuditLog_configVersionId_createdAt_idx" ON "OrcamentoAuditLog"("configVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "OrcamentoAuditLog_acao_createdAt_idx" ON "OrcamentoAuditLog"("acao", "createdAt");

-- CreateIndex
CREATE INDEX "OrcamentoAuditLog_status_createdAt_idx" ON "OrcamentoAuditLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrcamentoAuditLog_requestId_idx" ON "OrcamentoAuditLog"("requestId");

-- CreateIndex
CREATE INDEX "SystemLog_type_idx" ON "SystemLog"("type");

-- CreateIndex
CREATE INDEX "SystemLog_action_idx" ON "SystemLog"("action");

-- CreateIndex
CREATE INDEX "SystemLog_requestId_idx" ON "SystemLog"("requestId");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_type_createdAt_idx" ON "SystemLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_unidadeId_createdAt_idx" ON "SystemLog"("unidadeId", "createdAt");

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "Avaliacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alocacao" ADD CONSTRAINT "Alocacao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alocacao" ADD CONSTRAINT "Alocacao_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsAppContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsAppContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidade" ADD CONSTRAINT "Unidade_parentUnidadeId_fkey" FOREIGN KEY ("parentUnidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeConfiguracaoVersao" ADD CONSTRAINT "UnidadeConfiguracaoVersao_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeDoencaRegra" ADD CONSTRAINT "UnidadeDoencaRegra_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeDoencaRegra" ADD CONSTRAINT "UnidadeDoencaRegra_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeRegraHora" ADD CONSTRAINT "UnidadeRegraHora_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeRegraHora" ADD CONSTRAINT "UnidadeRegraHora_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeTaxaPagamento" ADD CONSTRAINT "UnidadeTaxaPagamento_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeTaxaPagamento" ADD CONSTRAINT "UnidadeTaxaPagamento_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeMinicusto" ADD CONSTRAINT "UnidadeMinicusto_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeMinicusto" ADD CONSTRAINT "UnidadeMinicusto_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadePercentualComissao" ADD CONSTRAINT "UnidadePercentualComissao_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadePercentualComissao" ADD CONSTRAINT "UnidadePercentualComissao_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeDescontoPreset" ADD CONSTRAINT "UnidadeDescontoPreset_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeDescontoPreset" ADD CONSTRAINT "UnidadeDescontoPreset_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeContratoTemplate" ADD CONSTRAINT "UnidadeContratoTemplate_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoSimulacao" ADD CONSTRAINT "OrcamentoSimulacao_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoSimulacao" ADD CONSTRAINT "OrcamentoSimulacao_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoSimulacao" ADD CONSTRAINT "OrcamentoSimulacao_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoSimulacao" ADD CONSTRAINT "OrcamentoSimulacao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoSimulacao" ADD CONSTRAINT "OrcamentoSimulacao_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "Avaliacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigAuditLog" ADD CONSTRAINT "ConfigAuditLog_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigAuditLog" ADD CONSTRAINT "ConfigAuditLog_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoAuditLog" ADD CONSTRAINT "OrcamentoAuditLog_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoAuditLog" ADD CONSTRAINT "OrcamentoAuditLog_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
