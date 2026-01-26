import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.resolve(process.cwd(), '.wa-state.json');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({
                success: true,
                data: [],
                message: 'Nenhum dado salvo ainda.'
            });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        // Converter objeto plana em array de estados estruturada
        const formattedData = Object.entries(data).map(([key, value]) => {
            try {
                // value é uma string JSON stringified (porque é assim que está no Map)
                return typeof value === 'string' ? JSON.parse(value) : value;
            } catch {
                return null;
            }
        }).filter(item => item !== null);

        // Ordenar por última interação (mais recente primeiro)
        formattedData.sort((a, b) => new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime());

        return NextResponse.json({ success: true, count: formattedData.length, data: formattedData });
    } catch (error) {
        console.error('Erro ao ler dados do WhatsApp:', error);
        return NextResponse.json({ success: false, error: 'Erro ao carregar dados' }, { status: 500 });
    }
}
