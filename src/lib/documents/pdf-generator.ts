import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

export interface PlantaoData {
    numero: number;
    dia: string;
    horario: string;
    turno: string;
    cuidador: string;
    valorCuidador: number;
    taxaMA: number;
    total: number;
}

export interface CenarioData {
    nome: string;
    totalSemanal: number;
    estimativaMensal: number;
    plantoes: PlantaoData[];
    parametros: {
        r0: number;
        a2p: number;
        an: number;
        afds: number;
        metodoPagamento: string;
        periodo: string;
    };
    descontos: Array<{ periodo: string; percentual: number }>;
    coberturaInicio?: string;
    coberturaFim?: string;
}

export interface PlanejamentoData {
    dataInicioCuidado?: string;
    dataFimCuidado?: string;
    diasAtendimento?: string[];
    periodicidade?: string;
    semanasPlanejadas?: number;
    mesesPlanejados?: number;
    horasCuidadoDia?: number;
    tempoCuidadoDescricao?: string;
    alocacaoResumo?: string;
    presetCobertura?: string;
}

export interface AvaliacaoSectionData {
    titulo: string;
    linhas: string[];
}

export interface ConfiguracaoComercialData {
    valorPeriodo: number;
    dataVencimento: string;
    descontoPercentual: number;
    descontoValor: number;
    acrescimosValor: number;
    metodosPagamento: string[];
    opcoesParcelamento: string[];
    entrada: number;
    parcelas: number;
    valorParcela: number;
    valorLiquido: number;
}

export interface OrcamentoPDFData {
    referencia: string;
    dataEmissao: string;
    validadeDias: number;
    pacienteNome: string;
    numeroPacientes: number;
    condicaoClinica: string;
    profissionalMinimo: string;
    cenario: CenarioData;
    planejamento?: PlanejamentoData;
    avaliacaoSecoes?: AvaliacaoSectionData[];
    configuracaoComercial: ConfiguracaoComercialData;
    tipo: 'PROPOSTA' | 'CONTRATO';
    presetCoberturaLabel?: string;
}

/* ── Brand & Design Tokens ───────────────────────────────────────── */
const BRAND_PRIMARY = '#00B0B9';
const BRAND_DARK = '#008A91';
const TEXT_PRIMARY = '#1A1A2E';
const TEXT_SECONDARY = '#4A4A68';
const TEXT_MUTED = '#6B7280';
const BG_SECTION = '#F1F8F9';
const BORDER_LIGHT = '#E2E8F0';
const WHITE = '#FFFFFF';
const TABLE_HEADER_BG = '#0A2540';
const TABLE_HEADER_TEXT = '#FFFFFF';
const TABLE_ROW_ALT = '#F7FAFC';
const HIGHLIGHT_BG = '#E6F7F8';
const HIGHLIGHT_BORDER = '#00B0B9';
const FOOTER_TEXT = '#94A3B8';

const PDF_FONT_REGULAR_NAME = 'Lato';
const PDF_FONT_BOLD_NAME = 'LatoBold';
const PDF_FONT_REGULAR_PATH = path.join(process.cwd(), 'src/assets/fonts/Lato-Regular.ttf');
const PDF_FONT_BOLD_PATH = path.join(process.cwd(), 'src/assets/fonts/Lato-Bold.ttf');

const PAGE_MARGIN = 50;
const CONTENT_LEFT = PAGE_MARGIN;

/* ── Utility Functions ───────────────────────────────────────────── */

function assertPdfFontAvailable(fontPath: string) {
    if (!fs.existsSync(fontPath)) {
        throw new Error(`Fonte PDF nao encontrada: ${fontPath}`);
    }
}

function brl(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function sanitizeCaregiverLabel(value: string, fallbackNumber: number): string {
    const raw = String(value || '').toUpperCase().trim();
    const match = raw.match(/\d+/);
    if (match) return `C${match[0]}`;
    return `C${fallbackNumber}`;
}

function escapePdfText(value: string) {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

/* ── Reusable PDF Drawing Helpers ────────────────────────────────── */

interface DocContext {
    doc: PDFKit.PDFDocument;
    width: number;
    y: number;
}

function ensureSpace(ctx: DocContext, needed: number): void {
    const usable = ctx.doc.page.height - 60;
    if (ctx.y + needed > usable) {
        ctx.doc.addPage();
        ctx.y = PAGE_MARGIN + 10;
    }
}

function drawSectionTitle(ctx: DocContext, number: string, title: string): void {
    ensureSpace(ctx, 30);
    ctx.y += 6;

    ctx.doc.rect(CONTENT_LEFT, ctx.y, 3, 16).fill(BRAND_PRIMARY);
    ctx.doc.fontSize(11).fillColor(TEXT_PRIMARY).font(PDF_FONT_BOLD_NAME);

    if (number) {
        ctx.doc.fillColor(BRAND_PRIMARY).text(number, CONTENT_LEFT + 10, ctx.y + 2, { continued: true });
        ctx.doc.fillColor(TEXT_PRIMARY).text(`  ${title}`);
    } else {
        ctx.doc.fillColor(TEXT_PRIMARY).text(title, CONTENT_LEFT + 10, ctx.y + 2);
    }

    ctx.y = ctx.doc.y + 10;
}

function drawSubSectionTitle(ctx: DocContext, title: string): void {
    ensureSpace(ctx, 24);
    ctx.doc.fontSize(9.5).fillColor(BRAND_DARK).font(PDF_FONT_BOLD_NAME).text(title, CONTENT_LEFT + 4, ctx.y);
    ctx.y = ctx.doc.y + 6;
}

function drawKeyValuePair(ctx: DocContext, label: string, value: string, labelWidth = 130): void {
    ensureSpace(ctx, 16);
    const startY = ctx.y;
    ctx.doc.fontSize(8.5).font(PDF_FONT_BOLD_NAME).fillColor(TEXT_SECONDARY)
        .text(label, CONTENT_LEFT + 8, ctx.y, { width: labelWidth });
    const afterLabel = ctx.doc.y;
    ctx.doc.font(PDF_FONT_REGULAR_NAME).fillColor(TEXT_PRIMARY)
        .text(String(value), CONTENT_LEFT + 8 + labelWidth, startY, { width: ctx.width - labelWidth - 16 });
    ctx.y = Math.max(afterLabel, ctx.doc.y) + 3;
}

function drawDivider(ctx: DocContext, color = BORDER_LIGHT): void {
    ctx.y += 4;
    ctx.doc.moveTo(CONTENT_LEFT, ctx.y).lineTo(CONTENT_LEFT + ctx.width, ctx.y)
        .strokeColor(color).lineWidth(0.5).stroke();
    ctx.y += 8;
}

function drawHighlightBox(ctx: DocContext, lines: Array<{ label: string; value: string; bold?: boolean }>): void {
    const boxHeight = 14 + lines.length * 18 + 8;
    ensureSpace(ctx, boxHeight);

    ctx.doc.roundedRect(CONTENT_LEFT, ctx.y, ctx.width, boxHeight, 4).fill(HIGHLIGHT_BG);
    ctx.doc.rect(CONTENT_LEFT, ctx.y, 3, boxHeight).fill(HIGHLIGHT_BORDER);

    let innerY = ctx.y + 10;
    for (const line of lines) {
        ctx.doc.fontSize(line.bold ? 10 : 8.5).fillColor(TEXT_PRIMARY);
        if (line.bold) {
            ctx.doc.font(PDF_FONT_BOLD_NAME).text(`${line.label}  ${line.value}`, CONTENT_LEFT + 14, innerY);
        } else {
            ctx.doc.font(PDF_FONT_BOLD_NAME).text(line.label, CONTENT_LEFT + 14, innerY, { continued: true });
            ctx.doc.font(PDF_FONT_REGULAR_NAME).text(` ${line.value}`);
        }
        innerY += 18;
    }

    ctx.y += boxHeight + 8;
}

function drawFooter(doc: PDFKit.PDFDocument, pageWidth: number, totalContentPages: number): void {
    const pages = doc.bufferedPageRange();
    const contentWidth = pageWidth - PAGE_MARGIN * 2;
    const totalPages = Math.min(pages.count, totalContentPages);

    for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        const bottom = doc.page.height - 35;

        doc.moveTo(PAGE_MARGIN, bottom - 10)
            .lineTo(PAGE_MARGIN + contentWidth, bottom - 10)
            .strokeColor(BORDER_LIGHT).lineWidth(0.5).stroke();

        doc.fontSize(7).fillColor(FOOTER_TEXT).font(PDF_FONT_REGULAR_NAME);
        doc.text(
            'Maos Amigas  |  CNPJ 52.724.250/0001-78  |  Toledo - PR  |  (45) 9 8825-0695',
            PAGE_MARGIN, bottom - 4,
            { width: contentWidth, align: 'center' },
        );
        doc.text(
            `Pagina ${i + 1} de ${totalPages}`,
            PAGE_MARGIN, bottom + 6,
            { width: contentWidth, align: 'center' },
        );
    }
}

/* ── Cover Page ──────────────────────────────────────────────────── */

function drawCoverPage(doc: PDFKit.PDFDocument, data: OrcamentoPDFData): void {
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const contentWidth = pageW - PAGE_MARGIN * 2;

    // ── White header area for logo (no dark background behind logo) ──
    doc.rect(0, 0, pageW, 130).fill(WHITE);

    const logoPath = path.join(process.cwd(), 'src/assets/logo.png');
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, PAGE_MARGIN, 30, { height: 55 });
    } else {
        doc.fontSize(24).fillColor(BRAND_PRIMARY).font(PDF_FONT_BOLD_NAME).text('MAOS AMIGAS', PAGE_MARGIN, 40);
    }

    // Company info aligned right next to logo
    doc.fontSize(8).fillColor(TEXT_MUTED).font(PDF_FONT_REGULAR_NAME)
        .text('Cuidadores de Idosos  |  Toledo - PR', PAGE_MARGIN, 95, { width: contentWidth, align: 'left' });
    doc.text('(45) 9 8825-0695  |  contato@maosamigas.com', PAGE_MARGIN, 107, { width: contentWidth, align: 'left' });

    // ── Brand accent stripe ──
    doc.rect(0, 125, pageW, 4).fill(BRAND_PRIMARY);

    // ── Teal gradient banner for document title ──
    doc.rect(0, 129, pageW, 90).fill(BRAND_PRIMARY);
    doc.rect(0, 219, pageW, 3).fill(BRAND_DARK);

    const titulo = data.tipo === 'PROPOSTA' ? 'PROPOSTA COMERCIAL' : 'CONTRATO DE SERVICOS';

    doc.fontSize(28).fillColor(WHITE).font(PDF_FONT_BOLD_NAME)
        .text(titulo, PAGE_MARGIN, 148, { width: contentWidth, align: 'center' });

    doc.fontSize(10).fillColor('#B2F0F3').font(PDF_FONT_REGULAR_NAME)
        .text('Servicos de Cuidado Domiciliar Especializado', PAGE_MARGIN, 185, { width: contentWidth, align: 'center' });

    // ── Content section on white background ──
    const infoY = 260;
    doc.fontSize(10).fillColor(TEXT_SECONDARY).font(PDF_FONT_REGULAR_NAME)
        .text('Preparado para:', PAGE_MARGIN, infoY, { width: contentWidth, align: 'center' });
    doc.fontSize(18).fillColor(BRAND_DARK).font(PDF_FONT_BOLD_NAME)
        .text(data.pacienteNome || 'Paciente', PAGE_MARGIN, infoY + 20, { width: contentWidth, align: 'center' });

    // ── Decorative line ──
    doc.moveTo(pageW / 2 - 40, infoY + 55)
        .lineTo(pageW / 2 + 40, infoY + 55)
        .strokeColor(BRAND_PRIMARY).lineWidth(2).stroke();

    // ── Detail boxes ──
    const detailsY = infoY + 75;
    const detailBoxW = 150;
    const gap = 20;
    const totalW = detailBoxW * 3 + gap * 2;
    const startX = (pageW - totalW) / 2;

    const details = [
        { label: 'Referencia', value: data.referencia },
        { label: 'Emissao', value: data.dataEmissao },
        { label: 'Validade', value: `${data.validadeDias} dias` },
    ];

    for (let i = 0; i < details.length; i++) {
        const x = startX + i * (detailBoxW + gap);
        doc.roundedRect(x, detailsY, detailBoxW, 50, 4).fill(BG_SECTION);
        doc.rect(x, detailsY, 3, 50).fill(BRAND_PRIMARY);
        doc.fontSize(7.5).fillColor(TEXT_MUTED).font(PDF_FONT_REGULAR_NAME)
            .text(details[i].label.toUpperCase(), x + 8, detailsY + 10, { width: detailBoxW - 12, align: 'center' });
        doc.fontSize(10).fillColor(TEXT_PRIMARY).font(PDF_FONT_BOLD_NAME)
            .text(details[i].value, x + 8, detailsY + 26, { width: detailBoxW - 12, align: 'center' });
    }

    // ── Confidentiality notice ──
    const confidentialY = pageH - 100;
    doc.moveTo(PAGE_MARGIN + 40, confidentialY - 8)
        .lineTo(PAGE_MARGIN + contentWidth - 40, confidentialY - 8)
        .strokeColor(BORDER_LIGHT).lineWidth(0.5).stroke();

    doc.fontSize(7).fillColor(TEXT_MUTED).font(PDF_FONT_REGULAR_NAME)
        .text(
            'DOCUMENTO CONFIDENCIAL - Este documento contem informacoes comerciais reservadas e destina-se exclusivamente ao destinatario acima indicado.',
            PAGE_MARGIN + 30, confidentialY,
            { width: contentWidth - 60, align: 'center' },
        );
}

/* ── Content Header (pages 2+) ───────────────────────────────────── */

function drawContentHeader(doc: PDFKit.PDFDocument, data: OrcamentoPDFData): number {
    const contentWidth = doc.page.width - PAGE_MARGIN * 2;

    // White background for logo - safe for non-transparent PNGs
    const logoPath = path.join(process.cwd(), 'src/assets/logo.png');
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, PAGE_MARGIN, PAGE_MARGIN - 5, { height: 20 });
    } else {
        doc.fontSize(10).fillColor(BRAND_PRIMARY).font(PDF_FONT_BOLD_NAME)
            .text('Maos Amigas', PAGE_MARGIN, PAGE_MARGIN - 2);
    }

    const titulo = data.tipo === 'PROPOSTA' ? 'Proposta Comercial' : 'Contrato de Servicos';
    doc.fontSize(7.5).fillColor(TEXT_MUTED).font(PDF_FONT_REGULAR_NAME)
        .text(`${titulo}  |  Ref. ${data.referencia}  |  ${data.dataEmissao}`, PAGE_MARGIN, PAGE_MARGIN, {
            width: contentWidth, align: 'right',
        });

    const lineY = PAGE_MARGIN + 18;
    doc.moveTo(PAGE_MARGIN, lineY).lineTo(PAGE_MARGIN + contentWidth, lineY)
        .strokeColor(BRAND_PRIMARY).lineWidth(0.75).stroke();

    return lineY + 12;
}

/* ── Main PDF Generation ─────────────────────────────────────────── */

export async function generateOrcamentoPDF(data: OrcamentoPDFData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        assertPdfFontAvailable(PDF_FONT_REGULAR_PATH);
        assertPdfFontAvailable(PDF_FONT_BOLD_PATH);

        const doc = new PDFDocument({
            size: 'A4',
            margin: PAGE_MARGIN,
            bufferPages: true,
            font: PDF_FONT_REGULAR_PATH,
        });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.registerFont(PDF_FONT_REGULAR_NAME, PDF_FONT_REGULAR_PATH);
        doc.registerFont(PDF_FONT_BOLD_NAME, PDF_FONT_BOLD_PATH);
        doc.font(PDF_FONT_REGULAR_NAME);

        const contentWidth = doc.page.width - PAGE_MARGIN * 2;

        /* ── Page 1: Cover ────────────────────────────────────── */
        drawCoverPage(doc, data);

        /* ── Page 2+: Content ─────────────────────────────────── */
        doc.addPage();
        let y = drawContentHeader(doc, data);

        const ctx: DocContext = { doc, width: contentWidth, y };

        /* ── 01 PERFIL DO ATENDIMENTO ─────────────────────────── */
        drawSectionTitle(ctx, '01', 'PERFIL DO ATENDIMENTO');

        const panelH = data.presetCoberturaLabel ? 84 : 70;
        doc.roundedRect(CONTENT_LEFT, ctx.y, contentWidth, panelH, 3).fill(BG_SECTION);

        const perfil: [string, string][] = [
            ['Pacientes:', `${data.numeroPacientes} idoso(s)`],
            ['Complexidade:', data.condicaoClinica],
            ['Profissional:', data.profissionalMinimo],
            ['Cobertura:', `${data.cenario.coberturaInicio ?? 'Dom 19h'} ate ${data.cenario.coberturaFim ?? 'Sab 07h'}`],
        ];
        if (data.presetCoberturaLabel) {
            perfil.push(['Tipo de cobertura:', data.presetCoberturaLabel]);
        }

        const savedY = ctx.y;
        ctx.y += 8;
        for (const [label, value] of perfil) {
            drawKeyValuePair(ctx, label, value);
        }
        ctx.y = Math.max(ctx.y, savedY + panelH + 4);

        /* ── 02 PLANEJAMENTO 360 ──────────────────────────────── */
        if (data.planejamento) {
            const planejamentoLinhas: Array<[string, string]> = [];
            if (data.planejamento.dataInicioCuidado || data.planejamento.dataFimCuidado) {
                planejamentoLinhas.push([
                    'Periodo:',
                    `${data.planejamento.dataInicioCuidado || '-'} ate ${data.planejamento.dataFimCuidado || '-'}`,
                ]);
            }
            if (data.planejamento.periodicidade) {
                planejamentoLinhas.push(['Periodicidade:', data.planejamento.periodicidade]);
            }
            if (data.planejamento.semanasPlanejadas !== undefined || data.planejamento.mesesPlanejados !== undefined) {
                planejamentoLinhas.push([
                    'Horizonte:',
                    `${data.planejamento.semanasPlanejadas ?? '-'} semana(s) / ${data.planejamento.mesesPlanejados ?? '-'} mes(es)`,
                ]);
            }
            if (data.planejamento.horasCuidadoDia !== undefined) {
                planejamentoLinhas.push(['Carga diaria:', `${data.planejamento.horasCuidadoDia}h/dia`]);
            }
            if (data.planejamento.diasAtendimento?.length) {
                planejamentoLinhas.push(['Dias:', data.planejamento.diasAtendimento.join(', ')]);
            }
            if (data.planejamento.tempoCuidadoDescricao) {
                planejamentoLinhas.push(['Tempo:', data.planejamento.tempoCuidadoDescricao]);
            }
            if (data.planejamento.alocacaoResumo) {
                planejamentoLinhas.push(['Alocacao:', data.planejamento.alocacaoResumo]);
            }

            if (planejamentoLinhas.length > 0) {
                drawSectionTitle(ctx, '02', 'PLANEJAMENTO 360');
                for (const [label, value] of planejamentoLinhas) {
                    drawKeyValuePair(ctx, label, value);
                }
            }
        }

        /* ── AVALIACAO COMPLETA ────────────────────────────────── */
        if (Array.isArray(data.avaliacaoSecoes) && data.avaliacaoSecoes.length > 0) {
            drawSectionTitle(ctx, '', 'AVALIACAO CLINICA');

            for (const secao of data.avaliacaoSecoes) {
                if (!secao?.linhas?.length) continue;
                ensureSpace(ctx, 40);

                drawSubSectionTitle(ctx, secao.titulo);

                doc.fontSize(8).fillColor(TEXT_SECONDARY).font(PDF_FONT_REGULAR_NAME);
                for (const linha of secao.linhas) {
                    const rendered = `  ${linha}`;
                    const lineHeight = doc.heightOfString(rendered, { width: contentWidth - 16 }) + 2;
                    ensureSpace(ctx, lineHeight + 2);
                    doc.text(rendered, CONTENT_LEFT + 8, ctx.y, { width: contentWidth - 16 });
                    ctx.y = doc.y + 2;
                }
                ctx.y += 4;
            }
        }

        drawDivider(ctx, BRAND_PRIMARY);

        /* ── 03 ESCALA SEMANAL DE PLANTOES ────────────────────── */
        drawSectionTitle(ctx, '03', 'ESCALA SEMANAL DE PLANTOES');

        const columns = [28, 62, 78, 78, 52, 74, 74, 50];
        const colTotal = columns.reduce((a, b) => a + b, 0);
        const scaleFactor = contentWidth / colTotal;
        const scaledColumns = columns.map((c) => c * scaleFactor);
        const headers = ['#', 'Dia', 'Horario', 'Turno', 'Cuid.', 'Val. Cuid.', 'Taxa MA', 'Total'];

        ensureSpace(ctx, 20);
        doc.rect(CONTENT_LEFT, ctx.y, contentWidth, 18).fill(TABLE_HEADER_BG);

        let x = CONTENT_LEFT;
        doc.fontSize(7.5).fillColor(TABLE_HEADER_TEXT).font(PDF_FONT_BOLD_NAME);
        for (let i = 0; i < headers.length; i++) {
            doc.text(headers[i], x + 4, ctx.y + 5, { width: scaledColumns[i] - 8, align: i >= 5 ? 'right' : 'left' });
            x += scaledColumns[i];
        }
        ctx.y += 18;

        let totalCuidador = 0;
        let totalTaxa = 0;
        let totalGeral = 0;

        doc.font(PDF_FONT_REGULAR_NAME).fontSize(7.5).fillColor(TEXT_PRIMARY);
        data.cenario.plantoes.forEach((plantao, index) => {
            ensureSpace(ctx, 16);
            x = CONTENT_LEFT;

            const rowBg = index % 2 === 0 ? WHITE : TABLE_ROW_ALT;
            doc.rect(CONTENT_LEFT, ctx.y, contentWidth, 15).fill(rowBg);
            doc.fillColor(TEXT_PRIMARY);

            const cells = [
                String(plantao.numero),
                plantao.dia,
                plantao.horario,
                plantao.turno,
                sanitizeCaregiverLabel(plantao.cuidador, (index % 6) + 1),
                brl(plantao.valorCuidador),
                brl(plantao.taxaMA),
                brl(plantao.total),
            ];

            for (let i = 0; i < cells.length; i++) {
                doc.text(cells[i], x + 4, ctx.y + 4, { width: scaledColumns[i] - 8, align: i >= 5 ? 'right' : 'left' });
                x += scaledColumns[i];
            }

            totalCuidador += plantao.valorCuidador;
            totalTaxa += plantao.taxaMA;
            totalGeral += plantao.total;
            ctx.y += 15;
        });

        doc.rect(CONTENT_LEFT, ctx.y, contentWidth, 17).fill(BRAND_PRIMARY);
        x = CONTENT_LEFT;
        const totals = ['', 'TOTAL SEMANAL', '', '', '', brl(totalCuidador), brl(totalTaxa), brl(totalGeral)];
        doc.fillColor(WHITE).font(PDF_FONT_BOLD_NAME).fontSize(7.5);
        for (let i = 0; i < totals.length; i++) {
            doc.text(totals[i], x + 4, ctx.y + 5, { width: scaledColumns[i] - 8, align: i >= 5 ? 'right' : 'left' });
            x += scaledColumns[i];
        }
        ctx.y += 25;

        /* ── 04 RESUMO FINANCEIRO ─────────────────────────────── */
        ensureSpace(ctx, 60);
        drawSectionTitle(ctx, '04', 'RESUMO FINANCEIRO');

        drawHighlightBox(ctx, [
            { label: 'Total Semanal:', value: brl(data.cenario.totalSemanal), bold: false },
            { label: 'Estimativa Mensal (x4,33):', value: brl(data.cenario.estimativaMensal), bold: false },
            { label: 'INVESTIMENTO FINAL:', value: brl(data.configuracaoComercial.valorLiquido), bold: true },
        ]);

        const comercial = data.configuracaoComercial;
        drawSubSectionTitle(ctx, 'Detalhamento Comercial');

        const comercialLinhas: Array<[string, string]> = [
            ['Valor do periodo:', brl(comercial.valorPeriodo)],
            ['Data vencimento:', comercial.dataVencimento],
            ['Desconto (%):', `${comercial.descontoPercentual.toFixed(2)}%`],
            ['Descontos (R$):', brl(comercial.descontoValor)],
            ['Acrescimos (R$):', brl(comercial.acrescimosValor)],
            ['Metodos de pagamento:', comercial.metodosPagamento.join(', ')],
            ['Forma de pagamento:', comercial.opcoesParcelamento.join(', ')],
            ['Entrada:', brl(comercial.entrada)],
            ['Parcelamento:', `${comercial.parcelas}x de ${brl(comercial.valorParcela)}`],
        ];

        for (const [label, value] of comercialLinhas) {
            drawKeyValuePair(ctx, label, value, 150);
        }

        ctx.y += 6;

        if (data.cenario.descontos.length > 0) {
            ensureSpace(ctx, 30 + data.cenario.descontos.length * 16);
            drawSubSectionTitle(ctx, 'Tabela de Descontos por Permanencia');

            const discountColumns = [160, 100, 160];
            const discountHeaders = ['Periodo', 'Desconto', 'Economia/mes'];

            doc.rect(CONTENT_LEFT, ctx.y, contentWidth > 420 ? 420 : contentWidth, 16).fill(TABLE_HEADER_BG);
            x = CONTENT_LEFT;
            doc.fillColor(TABLE_HEADER_TEXT).font(PDF_FONT_BOLD_NAME).fontSize(7.5);
            for (let i = 0; i < discountHeaders.length; i++) {
                doc.text(discountHeaders[i], x + 6, ctx.y + 4, { width: discountColumns[i] });
                x += discountColumns[i];
            }
            ctx.y += 16;

            for (let i = 0; i < data.cenario.descontos.length; i++) {
                const desconto = data.cenario.descontos[i];
                const rowBg = i % 2 === 0 ? WHITE : TABLE_ROW_ALT;
                doc.rect(CONTENT_LEFT, ctx.y, contentWidth > 420 ? 420 : contentWidth, 15).fill(rowBg);
                x = CONTENT_LEFT;
                doc.fillColor(TEXT_PRIMARY).font(PDF_FONT_REGULAR_NAME).fontSize(7.5);
                doc.text(desconto.periodo, x + 6, ctx.y + 4, { width: discountColumns[0] });
                x += discountColumns[0];
                doc.text(`${desconto.percentual}%`, x + 6, ctx.y + 4, { width: discountColumns[1] });
                x += discountColumns[1];
                doc.font(PDF_FONT_BOLD_NAME).fillColor(BRAND_DARK)
                    .text(brl(data.cenario.estimativaMensal * desconto.percentual / 100), x + 6, ctx.y + 4, { width: discountColumns[2] });
                ctx.y += 15;
            }
            ctx.y += 8;
        }

        /* ── 05 COMPOSICAO DO PRECO ───────────────────────────── */
        ensureSpace(ctx, 50);
        drawSectionTitle(ctx, '05', 'COMPOSICAO DO PRECO POR PLANTAO');

        const { r0, a2p, an, afds } = data.cenario.parametros;
        const valorDiurno = r0 * (1 + a2p / 100);
        const valorNoturno = valorDiurno * (1 + an / 100);
        const valorFds = valorNoturno * (1 + afds / 100);

        const compCols = [180, 90, 90, 90];
        const compHeaders = ['Componente', 'Diurno', 'Noturno', 'Not.+FDS'];
        const compTableW = compCols.reduce((a, b) => a + b, 0);

        doc.rect(CONTENT_LEFT, ctx.y, compTableW, 16).fill(TABLE_HEADER_BG);
        x = CONTENT_LEFT;
        doc.fillColor(TABLE_HEADER_TEXT).font(PDF_FONT_BOLD_NAME).fontSize(7.5);
        for (let i = 0; i < compHeaders.length; i++) {
            doc.text(compHeaders[i], x + 4, ctx.y + 4, { width: compCols[i], align: i > 0 ? 'right' : 'left' });
            x += compCols[i];
        }
        ctx.y += 16;

        const compositionRows = [
            [`Base cuidador (R0 = ${brl(r0)})`, brl(r0), brl(r0), brl(r0)],
            [`+ 2o paciente (${a2p}%)`, brl(r0 * a2p / 100), brl(r0 * a2p / 100), brl(r0 * a2p / 100)],
            [`+ Noturno (${an}%)`, '-', brl(valorDiurno * an / 100), brl(valorDiurno * an / 100)],
            [`+ FDS (${afds}%)`, '-', '-', brl(valorNoturno * afds / 100)],
        ];

        doc.font(PDF_FONT_REGULAR_NAME).fontSize(7.5).fillColor(TEXT_PRIMARY);
        for (let row = 0; row < compositionRows.length; row++) {
            const rowBg = row % 2 === 0 ? WHITE : TABLE_ROW_ALT;
            doc.rect(CONTENT_LEFT, ctx.y, compTableW, 15).fill(rowBg);
            x = CONTENT_LEFT;
            doc.fillColor(TEXT_PRIMARY);
            for (let col = 0; col < compositionRows[row].length; col++) {
                doc.text(compositionRows[row][col], x + 4, ctx.y + 4, { width: compCols[col], align: col > 0 ? 'right' : 'left' });
                x += compCols[col];
            }
            ctx.y += 15;
        }

        doc.rect(CONTENT_LEFT, ctx.y, compTableW, 17).fill(BRAND_PRIMARY);
        x = CONTENT_LEFT;
        const compTotals = ['Preco Final ao Cliente', brl(valorDiurno), brl(valorNoturno), brl(valorFds)];
        doc.fillColor(WHITE).font(PDF_FONT_BOLD_NAME).fontSize(7.5);
        for (let i = 0; i < compTotals.length; i++) {
            doc.text(compTotals[i], x + 4, ctx.y + 5, { width: compCols[i], align: i > 0 ? 'right' : 'left' });
            x += compCols[i];
        }
        ctx.y += 25;

        /* ── 06 CONDICOES GERAIS (Contrato only) ─────────────── */
        if (data.tipo === 'CONTRATO') {
            ensureSpace(ctx, 50);
            drawSectionTitle(ctx, '06', 'CONDICOES GERAIS');

            const condicoes = [
                `Pagamento: ${comercial.metodosPagamento.join(', ')}.`,
                `Parcelamento disponivel: ${comercial.opcoesParcelamento.join(', ')}.`,
                'Substituicao: profissional substituto acionado sem custo adicional em caso de falta.',
                'Cancelamento: conforme politica do contrato. Menos de 24h pode incorrer em taxa.',
                'Reajuste: valores revisados trimestralmente ou conforme alteracao de escopo.',
                'LGPD: dados do paciente tratados conforme Lei 13.709/2018.',
                `Validade: ${data.validadeDias} dias a partir de ${data.dataEmissao}.`,
            ];

            doc.fontSize(8).fillColor(TEXT_SECONDARY).font(PDF_FONT_REGULAR_NAME);
            for (const condicao of condicoes) {
                ensureSpace(ctx, 16);
                const text = `  ${condicao}`;
                doc.text(text, CONTENT_LEFT + 8, ctx.y, { width: contentWidth - 16 });
                ctx.y = doc.y + 4;
            }
        }

        /* ── VALIDADE & ACEITE ────────────────────────────────── */
        ensureSpace(ctx, 60);
        drawDivider(ctx, BRAND_PRIMARY);

        const validadeBoxH = 44;
        doc.roundedRect(CONTENT_LEFT, ctx.y, contentWidth, validadeBoxH, 4).fill(BG_SECTION);
        doc.rect(CONTENT_LEFT, ctx.y, 3, validadeBoxH).fill(BRAND_PRIMARY);

        doc.fontSize(9).fillColor(TEXT_PRIMARY).font(PDF_FONT_BOLD_NAME)
            .text('Validade desta proposta', CONTENT_LEFT + 14, ctx.y + 10);
        doc.fontSize(8.5).fillColor(TEXT_SECONDARY).font(PDF_FONT_REGULAR_NAME)
            .text(
                `Este documento e valido por ${data.validadeDias} dias a partir de ${data.dataEmissao}. Apos este periodo, os valores e condicoes poderao ser revisados.`,
                CONTENT_LEFT + 14, ctx.y + 24, { width: contentWidth - 28 },
            );
        ctx.y += validadeBoxH + 16;

        ensureSpace(ctx, 80);
        doc.fontSize(9).fillColor(TEXT_PRIMARY).font(PDF_FONT_BOLD_NAME)
            .text('Aceite e Aprovacao', CONTENT_LEFT, ctx.y);
        ctx.y += 16;

        doc.fontSize(8).fillColor(TEXT_SECONDARY).font(PDF_FONT_REGULAR_NAME)
            .text(
                'Ao aceitar esta proposta, o contratante concorda com os termos, valores e condicoes descritos neste documento.',
                CONTENT_LEFT, ctx.y, { width: contentWidth },
            );
        ctx.y = doc.y + 20;

        const sigW = (contentWidth - 40) / 2;
        const sigY = ctx.y;

        doc.moveTo(CONTENT_LEFT, sigY).lineTo(CONTENT_LEFT + sigW, sigY)
            .strokeColor(TEXT_MUTED).lineWidth(0.5).stroke();
        doc.fontSize(7.5).fillColor(TEXT_MUTED).font(PDF_FONT_REGULAR_NAME)
            .text('Contratante', CONTENT_LEFT, sigY + 4, { width: sigW, align: 'center' });
        doc.text(`${data.pacienteNome}`, CONTENT_LEFT, sigY + 14, { width: sigW, align: 'center' });

        doc.moveTo(CONTENT_LEFT + sigW + 40, sigY).lineTo(CONTENT_LEFT + contentWidth, sigY)
            .strokeColor(TEXT_MUTED).lineWidth(0.5).stroke();
        doc.text('Maos Amigas Home Care', CONTENT_LEFT + sigW + 40, sigY + 4, { width: sigW, align: 'center' });
        doc.text('CNPJ 52.724.250/0001-78', CONTENT_LEFT + sigW + 40, sigY + 14, { width: sigW, align: 'center' });

        /* ── Footer on content pages only ─────────────────────── */
        // Calculate the actual number of pages with content
        // Page index is 0-based; current page after signatures is the last real page
        const pages = doc.bufferedPageRange();
        const currentPageIndex = pages.count; // pages buffered so far
        drawFooter(doc, doc.page.width, currentPageIndex);

        doc.flushPages();
        doc.end();
    });
}

export function generatePropostaPDF(data: OrcamentoPDFData): Promise<Buffer> {
    return generateOrcamentoPDF({ ...data, tipo: 'PROPOSTA' });
}

export function generateContratoPDF(data: OrcamentoPDFData): Promise<Buffer> {
    return generateOrcamentoPDF({ ...data, tipo: 'CONTRATO' });
}

export async function generateContractTextPDF(title: string, content: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        assertPdfFontAvailable(PDF_FONT_REGULAR_PATH);
        assertPdfFontAvailable(PDF_FONT_BOLD_PATH);

        const doc = new PDFDocument({
            size: 'A4',
            margin: PAGE_MARGIN,
            bufferPages: true,
            font: PDF_FONT_REGULAR_PATH,
        });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.registerFont(PDF_FONT_REGULAR_NAME, PDF_FONT_REGULAR_PATH);
        doc.registerFont(PDF_FONT_BOLD_NAME, PDF_FONT_BOLD_PATH);

        const contentWidth = doc.page.width - PAGE_MARGIN * 2;
        let y = PAGE_MARGIN;

        // Logo on white background (safe for non-transparent PNGs)
        const logoPath = path.join(process.cwd(), 'src/assets/logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, PAGE_MARGIN, y, { height: 35 });
        } else {
            doc.fontSize(16).fillColor(BRAND_PRIMARY).font(PDF_FONT_BOLD_NAME).text('Maos Amigas', PAGE_MARGIN, y);
        }

        doc.fontSize(11).fillColor(TEXT_PRIMARY).font(PDF_FONT_BOLD_NAME)
            .text(title, PAGE_MARGIN + 150, y + 4, { align: 'right', width: contentWidth - 150 });
        doc.fontSize(8).fillColor(TEXT_MUTED).font(PDF_FONT_REGULAR_NAME)
            .text('(45) 9 8825-0695  |  contato@maosamigas.com  |  Toledo - PR', PAGE_MARGIN + 150, y + 20, { align: 'right', width: contentWidth - 150 });

        y += 45;
        doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + contentWidth, y)
            .strokeColor(BRAND_PRIMARY).lineWidth(0.75).stroke();

        doc.y = y + 12;
        doc.font(PDF_FONT_REGULAR_NAME).fontSize(9).fillColor(TEXT_PRIMARY);

        let pageCount = 1;
        const lines = String(content || '').split(/\r?\n/);
        for (const line of lines) {
            if (doc.y > doc.page.height - 60) {
                doc.addPage();
                doc.font(PDF_FONT_REGULAR_NAME).fontSize(9).fillColor(TEXT_PRIMARY);
                pageCount++;
            }
            doc.text(line || ' ', { width: contentWidth, align: 'left' });
        }

        drawFooter(doc, doc.page.width, pageCount);

        doc.flushPages();
        doc.end();
    });
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
