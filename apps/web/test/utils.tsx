import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { App } from '../src/App';

/** Renderiza la app completa en una ruta, con un usuario simulado. */
export function renderApp(ruta: string): RenderResult & { usuario: UserEvent } {
  const usuario = userEvent.setup();
  const resultado = render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );
  return { usuario, ...resultado };
}
