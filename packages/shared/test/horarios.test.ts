import { describe, expect, it } from 'vitest';
import { estaAbierto, type Horario } from '../src';

// Argentina es UTC-3 todo el año (sin horario de verano).
// 2026-11-20 es viernes (diaSemana 5).
const ar = (iso: string) => new Date(`${iso}-03:00`);

const horarios: Horario[] = [
  { diaSemana: 5, abre: '11:30', cierra: '15:00' }, // viernes mediodía
  { diaSemana: 5, abre: '20:00', cierra: '01:00' }, // viernes noche, cruza la medianoche
];

describe('estaAbierto', () => {
  it.each([
    ['2026-11-20T12:00', true, 'viernes mediodía'],
    ['2026-11-20T11:30', true, 'justo cuando abre'],
    ['2026-11-20T15:00', false, 'justo cuando cierra (cierre excluido)'],
    ['2026-11-20T17:00', false, 'entre franjas'],
    ['2026-11-20T23:59', true, 'viernes a la noche'],
    ['2026-11-21T00:30', true, 'sábado de madrugada, sigue la franja del viernes'],
    ['2026-11-21T01:00', false, 'sábado 1 hs, ya cerró'],
    ['2026-11-21T21:00', false, 'sábado a la noche, no hay franja'],
    ['2026-11-19T00:30', false, 'jueves de madrugada (no hubo franja el miércoles)'],
  ])('%s -> %s (%s)', (fecha, esperado) => {
    expect(estaAbierto(horarios, ar(fecha))).toBe(esperado);
  });

  it('sin horarios cargados está cerrado', () => {
    expect(estaAbierto([], ar('2026-11-20T12:00'))).toBe(false);
  });

  it('usa la hora de Argentina aunque la fecha venga en UTC', () => {
    // 2026-11-20 15:00 UTC = 12:00 en Argentina
    expect(estaAbierto(horarios, new Date('2026-11-20T15:00:00Z'))).toBe(true);
  });

  it('la franja del sábado a la madrugada respeta el cambio de semana (sábado -> domingo)', () => {
    const sabadoNoche: Horario[] = [{ diaSemana: 6, abre: '20:00', cierra: '02:00' }];
    expect(estaAbierto(sabadoNoche, ar('2026-11-22T01:00'))).toBe(true); // domingo 1 hs
  });
});
