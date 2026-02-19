'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AdminRole, Capability } from '@/lib/auth/roles';

interface AuthMeResponse {
    success: boolean;
    data?: {
        userId: string;
        email: string;
        role: AdminRole;
        capabilities: Capability[];
    };
}

export function useCapabilities(): {
    capabilities: Capability[];
    hasCapability: (cap: Capability) => boolean;
    loading: boolean;
    role: AdminRole | null;
} {
    const [loading, setLoading] = useState(true);
    const [capabilities, setCapabilities] = useState<Capability[]>([]);
    const [role, setRole] = useState<AdminRole | null>(null);

    useEffect(() => {
        let active = true;

        async function fetchCapabilities() {
            try {
                const response = await fetch('/api/admin/auth/me', { cache: 'no-store' });
                const payload: AuthMeResponse = await response.json().catch(() => ({ success: false }));
                if (!active) return;

                if (response.ok && payload.success && payload.data) {
                    setCapabilities(payload.data.capabilities || []);
                    setRole(payload.data.role || null);
                } else {
                    setCapabilities([]);
                    setRole(null);
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        fetchCapabilities();
        return () => {
            active = false;
        };
    }, []);

    const hasCapability = useMemo(
        () => (cap: Capability) => capabilities.includes(cap),
        [capabilities]
    );

    return { capabilities, hasCapability, loading, role };
}
