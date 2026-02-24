/**
 * Soft delete utilities for models with a `deletedAt` field.
 *
 * Models with soft delete: Paciente, Cuidador, Avaliacao, Orcamento, Alocacao
 *
 * Usage in repositories:
 *   where: { ...filters, ...notDeleted }
 *   data: softDeleteData()
 *   where: { ...filters, ...includeDeleted } // to see deleted records
 */

/** Filter condition to exclude soft-deleted records */
export const notDeleted = { deletedAt: null } as const;

/** Data to set when soft-deleting a record */
export function softDeleteData() {
    return { deletedAt: new Date() };
}

/** Filter condition to include all records (even deleted) */
export const includeDeleted = {} as const;
