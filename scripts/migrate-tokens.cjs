const fs = require('fs');
const path = require('path');

const srcDirs = [
    path.join(__dirname, '..', 'src', 'app', 'admin'),
    path.join(__dirname, '..', 'src', 'components'),
    path.join(__dirname, '..', 'src', 'app'),
];

const replacements = [
    // text-gray → neutral
    ['text-gray-900', 'text-[var(--neutral-900)]'],
    ['text-gray-800', 'text-[var(--neutral-800)]'],
    ['text-gray-700', 'text-[var(--neutral-700)]'],
    ['text-gray-600', 'text-[var(--neutral-600)]'],
    ['text-gray-500', 'text-[var(--neutral-500)]'],
    ['text-gray-400', 'text-[var(--neutral-400)]'],
    ['text-gray-300', 'text-[var(--neutral-300)]'],
    // bg-gray → neutral
    ['bg-gray-950', 'bg-[var(--neutral-950)]'],
    ['bg-gray-900', 'bg-[var(--neutral-900)]'],
    ['bg-gray-800', 'bg-[var(--neutral-800)]'],
    ['bg-gray-700', 'bg-[var(--neutral-700)]'],
    ['bg-gray-200', 'bg-[var(--neutral-200)]'],
    ['bg-gray-100', 'bg-[var(--neutral-100)]'],
    ['bg-gray-50', 'bg-[var(--neutral-50)]'],
    // border-gray → neutral
    ['border-gray-300', 'border-[var(--neutral-300)]'],
    ['border-gray-200', 'border-[var(--neutral-200)]'],
    ['border-gray-100', 'border-[var(--neutral-100)]'],
    ['divide-gray-200', 'divide-[var(--neutral-200)]'],
    ['divide-gray-100', 'divide-[var(--neutral-100)]'],
    ['hover:bg-gray-50', 'hover:bg-[var(--neutral-50)]'],
    ['hover:bg-gray-100', 'hover:bg-[var(--neutral-100)]'],
    ['hover:text-gray-700', 'hover:text-[var(--neutral-700)]'],
    ['hover:text-gray-600', 'hover:text-[var(--neutral-600)]'],
    ['hover:text-gray-500', 'hover:text-[var(--neutral-500)]'],
    ['group-hover:bg-gray-100', 'group-hover:bg-[var(--neutral-100)]'],
    ['ring-gray-300', 'ring-[var(--neutral-300)]'],
    ['focus:ring-gray-300', 'focus:ring-[var(--neutral-300)]'],
    ['placeholder-gray-400', 'placeholder-[var(--neutral-400)]'],
    ['placeholder-gray-500', 'placeholder-[var(--neutral-500)]'],
    // blue → primary/info
    ['text-blue-800', 'text-[var(--primary-700)]'],
    ['text-blue-700', 'text-[var(--primary-700)]'],
    ['text-blue-600', 'text-[var(--primary-600)]'],
    ['text-blue-500', 'text-[var(--info-500)]'],
    ['text-blue-400', 'text-[var(--info-500)]'],
    ['bg-blue-700', 'bg-[var(--primary-700)]'],
    ['bg-blue-600', 'bg-[var(--primary-600)]'],
    ['bg-blue-500', 'bg-[var(--primary-500)]'],
    ['bg-blue-400', 'bg-[var(--primary-400)]'],
    ['bg-blue-200', 'bg-[var(--info-100)]'],
    ['bg-blue-100', 'bg-[var(--info-100)]'],
    ['bg-blue-50', 'bg-[var(--info-50)]'],
    ['hover:bg-blue-700', 'hover:bg-[var(--primary-700)]'],
    ['hover:bg-blue-600', 'hover:bg-[var(--primary-600)]'],
    ['hover:bg-blue-50', 'hover:bg-[var(--info-50)]'],
    ['hover:text-blue-700', 'hover:text-[var(--primary-700)]'],
    ['hover:text-blue-600', 'hover:text-[var(--primary-600)]'],
    ['active:bg-blue-700', 'active:bg-[var(--primary-700)]'],
    ['group-hover:bg-blue-100', 'group-hover:bg-[var(--info-100)]'],
    ['group-hover:text-blue-600', 'group-hover:text-[var(--primary-600)]'],
    ['border-blue-500', 'border-[var(--primary-500)]'],
    ['border-blue-200', 'border-[var(--primary-200)]'],
    ['border-blue-100', 'border-[var(--primary-100)]'],
    ['ring-blue-500', 'ring-[var(--primary-500)]'],
    ['ring-blue-200', 'ring-[var(--primary-200)]'],
    ['focus:ring-blue-500', 'focus:ring-[var(--primary-500)]'],
    ['focus:border-blue-500', 'focus:border-[var(--primary-500)]'],
    ['from-blue-600', 'from-[var(--primary-600)]'],
    ['from-blue-500', 'from-[var(--primary-500)]'],
    ['to-blue-700', 'to-[var(--primary-700)]'],
    ['to-blue-600', 'to-[var(--primary-600)]'],
    // green → secondary/success
    ['text-green-800', 'text-[var(--secondary-700)]'],
    ['text-green-700', 'text-[var(--secondary-700)]'],
    ['text-green-600', 'text-[var(--secondary-600)]'],
    ['text-green-500', 'text-[var(--success-500)]'],
    ['text-green-400', 'text-[var(--success-500)]'],
    ['bg-green-700', 'bg-[var(--secondary-700)]'],
    ['bg-green-600', 'bg-[var(--secondary-600)]'],
    ['bg-green-500', 'bg-[var(--secondary-500)]'],
    ['bg-green-400', 'bg-[var(--secondary-400)]'],
    ['bg-green-200', 'bg-[var(--success-100)]'],
    ['bg-green-100', 'bg-[var(--success-100)]'],
    ['bg-green-50', 'bg-[var(--success-50)]'],
    ['hover:bg-green-700', 'hover:bg-[var(--secondary-700)]'],
    ['hover:bg-green-600', 'hover:bg-[var(--secondary-600)]'],
    ['hover:bg-green-50', 'hover:bg-[var(--success-50)]'],
    ['active:bg-green-700', 'active:bg-[var(--secondary-700)]'],
    ['group-hover:bg-green-100', 'group-hover:bg-[var(--success-100)]'],
    ['border-green-500', 'border-[var(--secondary-500)]'],
    ['border-green-300', 'border-[var(--secondary-400)]/40'],
    ['border-green-200', 'border-[var(--secondary-400)]/30'],
    ['ring-green-500', 'ring-[var(--secondary-500)]'],
    ['focus:ring-green-500', 'focus:ring-[var(--secondary-500)]'],
    ['focus:border-green-500', 'focus:border-[var(--secondary-500)]'],
    ['from-green-600', 'from-[var(--secondary-600)]'],
    ['from-green-500', 'from-[var(--secondary-500)]'],
    ['to-green-700', 'to-[var(--secondary-700)]'],
    // red → error
    ['text-red-800', 'text-[var(--error-700)]'],
    ['text-red-700', 'text-[var(--error-700)]'],
    ['text-red-600', 'text-[var(--error-600)]'],
    ['text-red-500', 'text-[var(--error-500)]'],
    ['text-red-400', 'text-[var(--error-500)]'],
    ['bg-red-700', 'bg-[var(--error-700)]'],
    ['bg-red-600', 'bg-[var(--error-600)]'],
    ['bg-red-500', 'bg-[var(--error-500)]'],
    ['bg-red-200', 'bg-[var(--error-100)]'],
    ['bg-red-100', 'bg-[var(--error-100)]'],
    ['bg-red-50', 'bg-[var(--error-50)]'],
    ['hover:bg-red-700', 'hover:bg-[var(--error-700)]'],
    ['hover:bg-red-600', 'hover:bg-[var(--error-600)]'],
    ['hover:bg-red-50', 'hover:bg-[var(--error-50)]'],
    ['active:bg-red-700', 'active:bg-[var(--error-700)]'],
    ['border-red-500', 'border-[var(--error-500)]'],
    ['border-red-300', 'border-[var(--error-500)]/40'],
    ['border-red-200', 'border-[var(--error-100)]'],
    ['ring-red-500', 'ring-[var(--error-500)]'],
    ['focus:ring-red-500', 'focus:ring-[var(--error-500)]'],
    // yellow/amber → warning
    ['text-yellow-800', 'text-[var(--warning-600)]'],
    ['text-yellow-700', 'text-[var(--warning-600)]'],
    ['text-yellow-600', 'text-[var(--warning-600)]'],
    ['text-yellow-500', 'text-[var(--warning-500)]'],
    ['text-amber-800', 'text-[var(--warning-600)]'],
    ['text-amber-700', 'text-[var(--warning-600)]'],
    ['text-amber-600', 'text-[var(--warning-600)]'],
    ['text-amber-500', 'text-[var(--warning-500)]'],
    ['bg-yellow-200', 'bg-[var(--warning-100)]'],
    ['bg-yellow-100', 'bg-[var(--warning-100)]'],
    ['bg-yellow-50', 'bg-[var(--warning-50)]'],
    ['bg-amber-100', 'bg-[var(--warning-100)]'],
    ['bg-amber-50', 'bg-[var(--warning-50)]'],
    ['border-yellow-500', 'border-[var(--warning-500)]'],
    ['border-yellow-200', 'border-[var(--warning-100)]'],
    ['border-amber-200', 'border-[var(--warning-100)]'],
    // purple → accent
    ['text-purple-700', 'text-[var(--accent-700)]'],
    ['text-purple-600', 'text-[var(--accent-600)]'],
    ['bg-purple-100', 'bg-[var(--accent-500)]/15'],
    ['bg-purple-50', 'bg-[var(--accent-500)]/10'],
    ['border-purple-300', 'border-[var(--accent-500)]/40'],
    // orange → accent
    ['text-orange-700', 'text-[var(--accent-700)]'],
    ['text-orange-600', 'text-[var(--accent-600)]'],
    ['bg-orange-100', 'bg-[var(--accent-500)]/15'],
    ['bg-orange-50', 'bg-[var(--accent-500)]/10'],
    // teal → primary
    ['text-teal-700', 'text-[var(--primary-700)]'],
    ['text-teal-600', 'text-[var(--primary-600)]'],
    ['bg-teal-100', 'bg-[var(--primary-100)]'],
    ['bg-teal-50', 'bg-[var(--primary-50)]'],
    ['bg-teal-600', 'bg-[var(--primary-600)]'],
    ['bg-teal-500', 'bg-[var(--primary-500)]'],
    ['border-teal-500', 'border-[var(--primary-500)]'],
    ['border-teal-200', 'border-[var(--primary-200)]'],
    // indigo → info
    ['text-indigo-700', 'text-[var(--info-600)]'],
    ['text-indigo-600', 'text-[var(--info-600)]'],
    ['bg-indigo-100', 'bg-[var(--info-100)]'],
    ['bg-indigo-50', 'bg-[var(--info-50)]'],
    // emerald → secondary
    ['text-emerald-700', 'text-[var(--secondary-700)]'],
    ['text-emerald-600', 'text-[var(--secondary-600)]'],
    ['bg-emerald-100', 'bg-[var(--secondary-400)]/15'],
    ['bg-emerald-50', 'bg-[var(--secondary-400)]/10'],
    // slate → neutral
    ['border-slate-300', 'border-[var(--neutral-300)]'],
    ['border-slate-200', 'border-[var(--neutral-200)]'],
    ['text-slate-700', 'text-[var(--neutral-700)]'],
    ['text-slate-600', 'text-[var(--neutral-600)]'],
    ['text-slate-500', 'text-[var(--neutral-500)]'],
    ['bg-slate-50', 'bg-[var(--neutral-50)]'],
    ['bg-slate-100', 'bg-[var(--neutral-100)]'],
    // sky → info
    ['text-sky-600', 'text-[var(--info-600)]'],
    ['bg-sky-100', 'bg-[var(--info-100)]'],
    ['bg-sky-50', 'bg-[var(--info-50)]'],
];

function walkDir(dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files.push(...walkDir(full));
        else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) files.push(full);
    }
    return files;
}

// Collect unique files from all source directories
const allFiles = new Set();
for (const dir of srcDirs) {
    walkDir(dir).forEach(f => allFiles.add(f));
}
const files = [...allFiles];

let totalFiles = 0;
let totalReplacements = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    const original = content;
    let fileReplacements = 0;

    for (const [from, to] of replacements) {
        const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = content.match(regex);
        if (matches) {
            fileReplacements += matches.length;
            content = content.replace(regex, to);
        }
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf-8');
        totalFiles++;
        totalReplacements += fileReplacements;
        console.log(`  ${path.relative(srcDirs[0], file)} - ${fileReplacements} replacements`);
    }
}

console.log(`\nDone: ${totalReplacements} replacements across ${totalFiles} files`);
