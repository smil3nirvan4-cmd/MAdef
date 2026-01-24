-- CreateTable
CREATE TABLE "Cuidador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "area" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CRIADO',
    "quizScore" INTEGER,
    "scoreRH" INTEGER,
    "competencias" TEXT,
    "endereco" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "cidade" TEXT,
    "bairro" TEXT,
    "status" TEXT NOT NULL DEFAULT 'LEAD',
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "gqpScore" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telefone" TEXT NOT NULL,
    "direcao" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "flow" TEXT,
    "step" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cuidadorId" TEXT,
    "pacienteId" TEXT,
    CONSTRAINT "Mensagem_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mensagem_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "validadoEm" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Avaliacao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "cenarioEconomico" TEXT,
    "cenarioRecomendado" TEXT,
    "cenarioPremium" TEXT,
    "cenarioSelecionado" TEXT,
    "valorFinal" REAL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "aprovadoPor" TEXT,
    "enviadoEm" DATETIME,
    "aceitoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Orcamento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alocacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuidadorId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "dataInicio" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE_FEEDBACK',
    "ofertadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responditoEm" DATETIME,
    "confirmadoT24" DATETIME,
    "confirmadoT2" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alocacao_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "dados" TEXT NOT NULL,
    "telefone" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WhatsAppSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "qrCode" TEXT,
    "connectedAt" DATETIME,
    "disconnectedAt" DATETIME,
    "lastActivity" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WhatsAppFlowState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "currentFlow" TEXT NOT NULL DEFAULT 'IDLE',
    "currentStep" TEXT NOT NULL DEFAULT '',
    "data" TEXT NOT NULL,
    "lastInteraction" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WhatsAppLock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WhatsAppCooldown" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Cuidador_telefone_key" ON "Cuidador"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_telefone_key" ON "Paciente"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppFlowState_phone_key" ON "WhatsAppFlowState"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppLock_resourceId_key" ON "WhatsAppLock"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppCooldown_key_key" ON "WhatsAppCooldown"("key");
