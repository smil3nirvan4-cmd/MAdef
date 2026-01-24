-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alocacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuidadorId" TEXT NOT NULL,
    "pacienteId" TEXT,
    "slotId" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "dataInicio" DATETIME NOT NULL,
    "hospital" TEXT,
    "quarto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE_FEEDBACK',
    "ofertadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responditoEm" DATETIME,
    "confirmadoT24" DATETIME,
    "confirmadoT2" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alocacao_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Alocacao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Alocacao" ("confirmadoT2", "confirmadoT24", "createdAt", "cuidadorId", "dataInicio", "diaSemana", "id", "ofertadoEm", "responditoEm", "slotId", "status", "turno") SELECT "confirmadoT2", "confirmadoT24", "createdAt", "cuidadorId", "dataInicio", "diaSemana", "id", "ofertadoEm", "responditoEm", "slotId", "status", "turno" FROM "Alocacao";
DROP TABLE "Alocacao";
ALTER TABLE "new_Alocacao" RENAME TO "Alocacao";
CREATE TABLE "new_Paciente" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Paciente" ("bairro", "cidade", "createdAt", "gqpScore", "id", "nome", "prioridade", "status", "telefone", "updatedAt") SELECT "bairro", "cidade", "createdAt", "gqpScore", "id", "nome", "prioridade", "status", "telefone", "updatedAt" FROM "Paciente";
DROP TABLE "Paciente";
ALTER TABLE "new_Paciente" RENAME TO "Paciente";
CREATE UNIQUE INDEX "Paciente_telefone_key" ON "Paciente"("telefone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
