import type { Horario } from './schemas';

export const ZONA_HORARIA_AR = 'America/Argentina/Buenos_Aires';

const DIAS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const aMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Día de la semana y minutos desde la medianoche de `fecha`, en la zona horaria indicada. */
export function momentoLocal(
  fecha: Date,
  timeZone = ZONA_HORARIA_AR,
): { dia: number; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return {
    dia: DIAS[get('weekday')] ?? 0,
    minutos: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/**
 * ¿El comercio está abierto en `fecha`?
 * Soporta franjas que cruzan la medianoche: { diaSemana: 5, abre: '20:00', cierra: '01:00' }
 * significa viernes 20 hs a sábado 1 hs.
 */
export function estaAbierto(
  horarios: readonly Horario[],
  fecha: Date = new Date(),
  timeZone = ZONA_HORARIA_AR,
): boolean {
  const { dia, minutos } = momentoLocal(fecha, timeZone);
  const diaAnterior = (dia + 6) % 7;

  return horarios.some((h) => {
    const abre = aMinutos(h.abre);
    const cierra = aMinutos(h.cierra);
    const cruzaMedianoche = cierra <= abre;

    if (!cruzaMedianoche) {
      return h.diaSemana === dia && minutos >= abre && minutos < cierra;
    }
    // Parte del mismo día (desde que abre hasta las 23:59)
    if (h.diaSemana === dia && minutos >= abre) return true;
    // Parte de la madrugada siguiente (desde 00:00 hasta que cierra)
    return h.diaSemana === diaAnterior && minutos < cierra;
  });
}
