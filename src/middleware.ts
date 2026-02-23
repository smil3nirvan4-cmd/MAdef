import { auth } from '@/auth';
import { metrics } from '@/lib/observability/metrics';

export default auth((req) => {
    const start = Date.now();
    const method = req.method;
    const pathname = req.nextUrl.pathname;

    // Track HTTP request metrics
    if (pathname.startsWith('/api/')) {
        // Normalize route for metrics (replace IDs with :id)
        const normalizedRoute = pathname.replace(/\/[a-z0-9]{20,}/gi, '/:id');
        const response = req.auth ? undefined : undefined; // auth middleware handles response
        // We record the request start; the actual status is tracked by response
        metrics.inc('http_requests_total');
        metrics.inc(`http_requests_${method.toLowerCase()}`);
        metrics.observe('http_request_duration_ms', Date.now() - start);
    }
});

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
