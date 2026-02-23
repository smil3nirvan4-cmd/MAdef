import { z } from 'zod';

export const idSchema = z.object({
    id: z.string().min(1, 'ID é obrigatório'),
});

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchSchema = z.object({
    q: z.string().optional(),
    ...paginationSchema.shape,
});
