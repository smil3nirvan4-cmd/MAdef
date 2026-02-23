import { z } from 'zod';

export const iniciarAlocacaoSchema = z.object({
    equipeId: z.string().min(1, 'equipeId é obrigatório'),
    pacienteId: z.string().min(1, 'pacienteId é obrigatório'),
    modo: z.enum(['IMPOSITIVA', 'ESCOLHA'], { message: 'modo deve ser IMPOSITIVA ou ESCOLHA' }),
    horasDiarias: z.union([z.literal(6), z.literal(12), z.literal(24)]).default(12),
    duracaoDias: z.number().min(1).max(365).default(7),
    cuidadores: z.array(z.object({
        id: z.string(),
        nome: z.string(),
        telefone: z.string(),
        disponibilidade: z.array(z.object({
            turno: z.enum(['MANHA', 'TARDE', 'NOITE']),
            diasSemana: z.array(z.number()),
        })),
        score: z.number().optional(),
    })).default([]),
});

export type IniciarAlocacaoInput = z.infer<typeof iniciarAlocacaoSchema>;
