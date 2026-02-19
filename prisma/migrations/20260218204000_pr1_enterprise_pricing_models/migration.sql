-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT,
    "estado" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "parentUnidadeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Unidade_parentUnidadeId_fkey" FOREIGN KEY ("parentUnidadeId") REFERENCES "Unidade" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnidadeConfiguracaoVersao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "effectiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "nome" TEXT,
    "descricao" TEXT,
    "createdBy" TEXT,
    "baseCuidador12h" REAL NOT NULL,
    "baseAuxiliarEnf12h" REAL NOT NULL,
    "baseTecnicoEnf12h" REAL NOT NULL,
    "baseEnfermeiro12h" REAL,
    "margemPercent" REAL NOT NULL DEFAULT 0,
    "lucroFixo" REAL NOT NULL DEFAULT 0,
    "lucroFixoEscalaHoras" BOOLEAN NOT NULL DEFAULT false,
    "adicionalSegundoPacientePercent" REAL NOT NULL DEFAULT 0,
    "adicionalNoturnoPercent" REAL NOT NULL DEFAULT 0,
    "adicionalFimSemanaPercent" REAL NOT NULL DEFAULT 0,
    "adicionalFeriadoPercent" REAL NOT NULL DEFAULT 0,
    "adicionalAltoRiscoPercent" REAL NOT NULL DEFAULT 0,
    "adicionalAtPercent" REAL NOT NULL DEFAULT 0,
    "adicionalAaPercent" REAL NOT NULL DEFAULT 0,
    "adicionalAtEscalaHoras" BOOLEAN NOT NULL DEFAULT true,
    "adicionalAaEscalaHoras" BOOLEAN NOT NULL DEFAULT true,
    "impostoSobreComissaoPercent" REAL NOT NULL DEFAULT 0,
    "aplicarTaxaAntesDesconto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnidadeConfiguracaoVersao_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnidadeDoencaRegra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "complexidade" TEXT NOT NULL,
    "profissionalMinimo" TEXT NOT NULL,
    "adicionalPercent" REAL NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnidadeDoencaRegra_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnidadeDoencaRegra_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnidadeRegraHora" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "hora" INTEGER NOT NULL,
    "fatorPercent" REAL NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnidadeRegraHora_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnidadeRegraHora_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnidadeTaxaPagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "taxaPercent" REAL NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnidadeTaxaPagamento_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnidadeTaxaPagamento_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnidadeMinicusto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "escalaHoras" BOOLEAN NOT NULL DEFAULT false,
    "ativoPadrao" BOOLEAN NOT NULL DEFAULT true,
    "opcionalNoFechamento" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnidadeMinicusto_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnidadeMinicusto_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnidadePercentualComissao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "percentual" REAL NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnidadePercentualComissao_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnidadePercentualComissao_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnidadeDescontoPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "etiqueta" TEXT,
    "percentual" REAL NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnidadeDescontoPreset_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnidadeDescontoPreset_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnidadeContratoTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "formato" TEXT NOT NULL DEFAULT 'MARKDOWN',
    "conteudo" TEXT NOT NULL,
    "placeholders" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "publicadoEm" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnidadeContratoTemplate_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrcamentoSimulacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT NOT NULL,
    "orcamentoId" TEXT,
    "pacienteId" TEXT,
    "avaliacaoId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ADMIN',
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "inputSnapshot" TEXT NOT NULL,
    "outputSnapshot" TEXT NOT NULL,
    "subtotal" REAL,
    "valorFinal" REAL,
    "descontoManualPercent" REAL,
    "descontoPresetNome" TEXT,
    "minicustosDesativados" TEXT,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrcamentoSimulacao_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrcamentoSimulacao_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrcamentoSimulacao_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrcamentoSimulacao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrcamentoSimulacao_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "Avaliacao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfigAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "configVersionId" TEXT,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "acao" TEXT NOT NULL,
    "beforeSnapshot" TEXT,
    "afterSnapshot" TEXT,
    "actorId" TEXT,
    "requestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConfigAuditLog_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConfigAuditLog_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Orcamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "unidadeId" TEXT,
    "configVersionId" TEXT,
    "avaliacaoId" TEXT,
    "cenarioEconomico" TEXT,
    "cenarioRecomendado" TEXT,
    "cenarioPremium" TEXT,
    "cenarioSelecionado" TEXT,
    "valorFinal" REAL,
    "snapshotInput" TEXT,
    "snapshotOutput" TEXT,
    "descontoManualPercent" REAL,
    "minicustosDesativados" TEXT,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "aprovadoPor" TEXT,
    "enviadoEm" DATETIME,
    "aceitoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Orcamento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Orcamento_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Orcamento_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Orcamento_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "Avaliacao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Orcamento" ("aceitoEm", "aprovadoPor", "cenarioEconomico", "cenarioPremium", "cenarioRecomendado", "cenarioSelecionado", "createdAt", "enviadoEm", "id", "pacienteId", "status", "valorFinal") SELECT "aceitoEm", "aprovadoPor", "cenarioEconomico", "cenarioPremium", "cenarioRecomendado", "cenarioSelecionado", "createdAt", "enviadoEm", "id", "pacienteId", "status", "valorFinal" FROM "Orcamento";
DROP TABLE "Orcamento";
ALTER TABLE "new_Orcamento" RENAME TO "Orcamento";
CREATE INDEX "Orcamento_pacienteId_createdAt_idx" ON "Orcamento"("pacienteId", "createdAt");
CREATE INDEX "Orcamento_unidadeId_createdAt_idx" ON "Orcamento"("unidadeId", "createdAt");
CREATE INDEX "Orcamento_configVersionId_idx" ON "Orcamento"("configVersionId");
CREATE INDEX "Orcamento_avaliacaoId_idx" ON "Orcamento"("avaliacaoId");
CREATE TABLE "new_SystemLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemLog_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SystemLog" ("action", "createdAt", "duration", "id", "ipAddress", "message", "metadata", "stack", "type", "userAgent", "userId") SELECT "action", "createdAt", "duration", "id", "ipAddress", "message", "metadata", "stack", "type", "userAgent", "userId" FROM "SystemLog";
DROP TABLE "SystemLog";
ALTER TABLE "new_SystemLog" RENAME TO "SystemLog";
CREATE INDEX "SystemLog_type_idx" ON "SystemLog"("type");
CREATE INDEX "SystemLog_action_idx" ON "SystemLog"("action");
CREATE INDEX "SystemLog_requestId_idx" ON "SystemLog"("requestId");
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");
CREATE INDEX "SystemLog_type_createdAt_idx" ON "SystemLog"("type", "createdAt");
CREATE INDEX "SystemLog_unidadeId_createdAt_idx" ON "SystemLog"("unidadeId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Unidade_codigo_key" ON "Unidade"("codigo");

-- CreateIndex
CREATE INDEX "Unidade_ativa_idx" ON "Unidade"("ativa");

-- CreateIndex
CREATE INDEX "UnidadeConfiguracaoVersao_unidadeId_isActive_idx" ON "UnidadeConfiguracaoVersao"("unidadeId", "isActive");

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

