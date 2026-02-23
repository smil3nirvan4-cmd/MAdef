import { z } from 'zod';

export const enviarPropostaSchema = z.object({
    phone: z.string().min(1, 'Telefone é obrigatório'),
    nome: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido').optional(),
    valorTotal: z.unknown().optional(),
    entrada: z.unknown().optional(),
    parcelas: z.unknown().optional(),
    valorParcela: z.unknown().optional(),
    vencimento: z.unknown().optional(),
    descontos: z.unknown().optional(),
    acrescimos: z.unknown().optional(),
    metodosPagamento: z.array(z.unknown()).optional(),
    opcoesParcelamento: z.array(z.unknown()).optional(),
    dadosDetalhados: z.unknown().optional(),
});

export type EnviarPropostaInput = z.infer<typeof enviarPropostaSchema>;
