export interface Slot {
    id: string; // C1, C2, ..., C8
    equipeId: string;
    turno: 'MANHA' | 'TARDE' | 'NOITE';
    diaSemana: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Domingo
    cuidadorId?: string;
    status: 'DISPONIVEL' | 'RESERVADO' | 'CONFIRMADO' | 'REJEITADO';
    dataInicio: Date;
    dataFim: Date;
}

export interface Equipe {
    id: string;
    pacienteId: string;
    duracaoDias: number;
    horasDiarias: 6 | 12 | 24;
    slots: Slot[];
    modoAlocacao: 'IMPOSITIVA' | 'ESCOLHA';
    status: 'MONTANDO' | 'COMPLETA' | 'ATIVA' | 'ENCERRADA';
}

// Gerar slots para uma equipe de 24h
export function gerarSlots24h(equipeId: string, dataInicio: Date, duracaoDias: number): Slot[] {
    const slots: Slot[] = [];
    const slotIds = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'];

    // Escala 12x36 para 24h
    // C1-C4: Diurno (alternam)
    // C5-C8: Noturno (alternam)

    for (let i = 0; i < 8; i++) {
        const turno = i < 4 ? 'MANHA' : 'NOITE';
        const diaBase = i % 4; // 0, 1, 2, 3

        slots.push({
            id: slotIds[i],
            equipeId,
            turno: turno === 'MANHA' ? 'MANHA' : 'NOITE',
            diaSemana: diaBase as 0 | 1 | 2 | 3 | 4 | 5 | 6,
            status: 'DISPONIVEL',
            dataInicio: new Date(dataInicio),
            dataFim: new Date(dataInicio.getTime() + duracaoDias * 24 * 60 * 60 * 1000),
        });
    }

    return slots;
}
