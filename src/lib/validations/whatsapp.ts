import { z } from 'zod';

export const pairSchema = z.object({
    phone: z.string().optional(),
});

export type PairInput = z.infer<typeof pairSchema>;
