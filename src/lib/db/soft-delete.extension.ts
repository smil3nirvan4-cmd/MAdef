import { Prisma } from '@prisma/client';

const SOFT_DELETE_MODELS = [
    'Cuidador',
    'Paciente',
    'Avaliacao',
    'Orcamento',
    'Alocacao',
] as const;

type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

function isSoftDeleteModel(model: string | undefined): model is SoftDeleteModel {
    return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
}

export const softDeleteExtension = Prisma.defineExtension({
    name: 'soft-delete',
    query: {
        $allModels: {
            async findMany({ model, args, query }) {
                if (isSoftDeleteModel(model)) {
                    args.where = { ...args.where, deletedAt: null };
                }
                return query(args);
            },
            async findFirst({ model, args, query }) {
                if (isSoftDeleteModel(model)) {
                    args.where = { ...args.where, deletedAt: null };
                }
                return query(args);
            },
            async findUnique({ model, args, query }) {
                if (isSoftDeleteModel(model)) {
                    // findUnique doesn't support arbitrary where filters,
                    // so we call query as-is and filter post-hoc
                    const result = await query(args);
                    if (result && (result as any).deletedAt !== null && (result as any).deletedAt !== undefined) {
                        return null;
                    }
                    return result;
                }
                return query(args);
            },
            async delete({ model, args, query }) {
                if (isSoftDeleteModel(model)) {
                    // Transform delete into soft-delete (update with deletedAt)
                    const context = Prisma.getExtensionContext(this) as any;
                    const modelName = model.charAt(0).toLowerCase() + model.slice(1);
                    return context[modelName].update({
                        where: args.where,
                        data: { deletedAt: new Date() },
                    });
                }
                return query(args);
            },
            async deleteMany({ model, args, query }) {
                if (isSoftDeleteModel(model)) {
                    const context = Prisma.getExtensionContext(this) as any;
                    const modelName = model.charAt(0).toLowerCase() + model.slice(1);
                    return context[modelName].updateMany({
                        where: args?.where,
                        data: { deletedAt: new Date() },
                    });
                }
                return query(args);
            },
        },
    },
});
