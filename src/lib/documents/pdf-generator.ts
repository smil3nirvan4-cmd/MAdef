function escapePdfText(value: string) {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

function buildPdfFromLines(lines: string[]): Buffer {
    const pageHeight = 842;
    const marginLeft = 50;
    const startY = 790;
    const lineHeight = 14;

    let cursorY = startY;
    const commands: string[] = ['BT', '/F1 11 Tf'];

    for (const line of lines) {
        if (cursorY < 60) break;
        commands.push(`${marginLeft} ${cursorY} Td (${escapePdfText(line)}) Tj`);
        cursorY -= lineHeight;
    }

    commands.push('ET');
    const streamContent = commands.join('\n');

    const objects = [
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
        '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
        `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj`,
        `4 0 obj << /Length ${Buffer.byteLength(streamContent, 'utf8')} >> stream\n${streamContent}\nendstream endobj`,
        '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (const obj of objects) {
        offsets.push(Buffer.byteLength(pdf, 'utf8'));
        pdf += `${obj}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';

    for (let i = 1; i < offsets.length; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
}

export function gerarPropostaPDF(lines: string[]): Buffer {
    return buildPdfFromLines(lines);
}

export function gerarContratoPDF(lines: string[]): Buffer {
    return buildPdfFromLines(lines);
}
