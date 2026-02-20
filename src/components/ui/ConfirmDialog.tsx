'use client';

import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary';
    isLoading?: boolean;
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title = 'Confirmar ação',
    description = 'Tem certeza que deseja continuar? Esta ação não pode ser desfeita.',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    isLoading = false,
}: ConfirmDialogProps) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            description={description}
            size="sm"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        isLoading={isLoading}
                    >
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div />
        </Modal>
    );
}
