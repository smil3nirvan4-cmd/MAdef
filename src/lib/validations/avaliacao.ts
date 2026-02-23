import { z } from 'zod';

export const hospitalAvaliacaoSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    hospital: z.string().min(1, 'Hospital é obrigatório'),
    quarto: z.string().optional(),
    nivel: z.string().min(1, 'Nivel é obrigatório'),
    phone: z.string().optional(),
});

export type HospitalAvaliacaoInput = z.infer<typeof hospitalAvaliacaoSchema>;
