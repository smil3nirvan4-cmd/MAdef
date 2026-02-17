import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function collectFiles(basePath, targetFile, relative = '') {
    const absolute = path.join(basePath, relative);
    if (!fs.existsSync(absolute)) return [];

    const entries = fs.readdirSync(absolute, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const childRelative = path.join(relative, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectFiles(basePath, targetFile, childRelative));
            continue;
        }
        if (entry.isFile() && entry.name === targetFile) {
            files.push(childRelative);
        }
    }

    return files;
}

function toApiRoute(relativePath) {
    const normalized = relativePath.replace(/\\/g, '/').replace(/\/route\.ts$/, '');
    return `/api/${normalized}`;
}

function toPageRoute(relativePath) {
    const normalized = relativePath.replace(/\\/g, '/').replace(/\/page\.tsx$/, '');
    return normalized ? `/${normalized}` : '/';
}

const apiBase = path.join(root, 'src', 'app', 'api');
const adminBase = path.join(root, 'src', 'app', 'admin');

const apiRoutes = collectFiles(apiBase, 'route.ts').map(toApiRoute).sort();
const adminPages = collectFiles(adminBase, 'page.tsx')
    .map((file) => toPageRoute(path.join('admin', file)))
    .sort();

console.log('=== API ROUTES ===');
for (const route of apiRoutes) console.log(route);

console.log('\n=== ADMIN PAGES ===');
for (const page of adminPages) console.log(page);

