import { estaAbierto, type Horario } from '@pedidos/shared';

export function EstadoAbierto({ horarios }: { horarios: readonly Horario[] }) {
  const abierto = estaAbierto(horarios);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        abierto ? 'bg-green-100 text-green-800' : 'bg-stone-200 text-stone-700'
      }`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${abierto ? 'bg-green-600' : 'bg-stone-500'}`}
      />
      {abierto ? 'Abierto' : 'Cerrado'}
    </span>
  );
}
