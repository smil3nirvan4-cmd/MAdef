import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// ─── Generic CRUD helpers for simple WA models ─────────────────────
function crudFor<
    TCreate extends Record<string, unknown>,
    TUpdate extends Record<string, unknown>,
>(model: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    count: (args?: any) => Promise<number>;
}) {
    return {
        async findAll(orderBy: Record<string, string> = { createdAt: 'desc' }) {
            return model.findMany({ orderBy });
        },
        async findById(id: string) {
            return model.findUnique({ where: { id } });
        },
        async create(data: TCreate) {
            return model.create({ data });
        },
        async update(id: string, data: TUpdate) {
            return model.update({ where: { id }, data });
        },
        async delete(id: string) {
            return model.delete({ where: { id } });
        },
        async count() {
            return model.count();
        },
    };
}

// ─── WhatsApp Queue ────────────────────────────────────────────────
export interface QueueListParams {
    page?: number;
    pageSize?: number;
    status?: string;
    phone?: string;
}

export const whatsappQueueRepository = {
    async findAll(params: QueueListParams = {}) {
        const page = params.page || 1;
        const pageSize = params.pageSize || 50;
        const where: Prisma.WhatsAppQueueItemWhereInput = {};
        if (params.status) where.status = params.status;
        if (params.phone) where.phone = { contains: params.phone };

        const [data, total] = await Promise.all([
            prisma.whatsAppQueueItem.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.whatsAppQueueItem.count({ where }),
        ]);

        return { data, total, page, pageSize };
    },

    async findById(id: string) {
        return prisma.whatsAppQueueItem.findUnique({ where: { id } });
    },

    async update(id: string, data: Prisma.WhatsAppQueueItemUpdateInput) {
        return prisma.whatsAppQueueItem.update({ where: { id }, data });
    },

    async updateMany(where: Prisma.WhatsAppQueueItemWhereInput, data: Prisma.WhatsAppQueueItemUpdateManyMutationInput) {
        return prisma.whatsAppQueueItem.updateMany({ where, data });
    },

    async deleteMany(where: Prisma.WhatsAppQueueItemWhereInput) {
        return prisma.whatsAppQueueItem.deleteMany({ where });
    },

    async count(where?: Prisma.WhatsAppQueueItemWhereInput) {
        return prisma.whatsAppQueueItem.count({ where });
    },

    async groupByStatus() {
        return prisma.whatsAppQueueItem.groupBy({
            by: ['status'],
            _count: { _all: true },
        });
    },
};

// ─── WhatsApp Flow State ───────────────────────────────────────────
export const whatsappFlowStateRepository = {
    async findAll(params: { page?: number; pageSize?: number } = {}) {
        const page = params.page || 1;
        const pageSize = params.pageSize || 50;
        const [data, total] = await Promise.all([
            prisma.whatsAppFlowState.findMany({
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.whatsAppFlowState.count(),
        ]);
        return { data, total, page, pageSize };
    },

    async findByPhone(phone: string) {
        return prisma.whatsAppFlowState.findUnique({ where: { phone } });
    },

    async upsert(phone: string, data: Prisma.WhatsAppFlowStateCreateInput) {
        return prisma.whatsAppFlowState.upsert({
            where: { phone },
            update: data,
            create: { ...data, phone },
        });
    },

    async update(phone: string, data: Prisma.WhatsAppFlowStateUpdateInput) {
        return prisma.whatsAppFlowState.update({ where: { phone }, data });
    },

    async delete(phone: string) {
        return prisma.whatsAppFlowState.delete({ where: { phone } });
    },

    async count() {
        return prisma.whatsAppFlowState.count();
    },
};

// ─── WhatsApp Flow Definitions ─────────────────────────────────────
export const whatsappFlowDefinitionRepository = crudFor<
    Prisma.WhatsAppFlowDefinitionCreateInput,
    Prisma.WhatsAppFlowDefinitionUpdateInput
>(prisma.whatsAppFlowDefinition);

// ─── Simple CRUD models ────────────────────────────────────────────
export const whatsappLabelRepository = crudFor<
    Prisma.WhatsAppLabelCreateInput,
    Prisma.WhatsAppLabelUpdateInput
>(prisma.whatsAppLabel);

export const whatsappTemplateRepository = crudFor<
    Prisma.WhatsAppTemplateCreateInput,
    Prisma.WhatsAppTemplateUpdateInput
>(prisma.whatsAppTemplate);

export const whatsappQuickReplyRepository = crudFor<
    Prisma.WhatsAppQuickReplyCreateInput,
    Prisma.WhatsAppQuickReplyUpdateInput
>(prisma.whatsAppQuickReply);

export const whatsappAutoReplyRepository = crudFor<
    Prisma.WhatsAppAutoReplyCreateInput,
    Prisma.WhatsAppAutoReplyUpdateInput
>(prisma.whatsAppAutoReply);

export const whatsappWebhookRepository = crudFor<
    Prisma.WhatsAppWebhookCreateInput,
    Prisma.WhatsAppWebhookUpdateInput
>(prisma.whatsAppWebhook);

export const whatsappBlacklistRepository = crudFor<
    Prisma.WhatsAppBlacklistCreateInput,
    Prisma.WhatsAppBlacklistUpdateInput
>(prisma.whatsAppBlacklist);

export const whatsappScheduledRepository = crudFor<
    Prisma.WhatsAppScheduledCreateInput,
    Prisma.WhatsAppScheduledUpdateInput
>(prisma.whatsAppScheduled);

// ─── WhatsApp Contacts ─────────────────────────────────────────────
export const whatsappContactRepository = {
    async findAll(params: { page?: number; pageSize?: number; search?: string } = {}) {
        const page = params.page || 1;
        const pageSize = params.pageSize || 50;
        const where: Prisma.WhatsAppContactWhereInput = {};
        if (params.search) {
            where.OR = [
                { phone: { contains: params.search } },
                { name: { contains: params.search } },
            ];
        }

        const [data, total] = await Promise.all([
            prisma.whatsAppContact.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.whatsAppContact.count({ where }),
        ]);

        return { data, total, page, pageSize };
    },

    async findByPhone(phone: string) {
        return prisma.whatsAppContact.findUnique({ where: { phone } });
    },

    async upsert(phone: string, data: Prisma.WhatsAppContactCreateInput) {
        return prisma.whatsAppContact.upsert({
            where: { phone },
            update: data,
            create: { ...data, phone },
        });
    },
};

// ─── WhatsApp Settings ─────────────────────────────────────────────
export const whatsappSettingRepository = {
    async findByKey(key: string) {
        return prisma.whatsAppSetting.findUnique({ where: { key } });
    },

    async findAll() {
        return prisma.whatsAppSetting.findMany({ orderBy: { key: 'asc' } });
    },

    async upsert(key: string, value: string) {
        return prisma.whatsAppSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    },
};
