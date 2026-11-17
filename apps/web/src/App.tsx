import { Route, Routes } from 'react-router';
import { Checkout } from './paginas/Checkout';
import { ComercioLayout } from './paginas/ComercioLayout';
import { Inicio } from './paginas/Inicio';
import { Menu } from './paginas/Menu';
import { NoEncontrado } from './paginas/NoEncontrado';

export function App() {
  return (
    <Routes>
      <Route index element={<Inicio />} />
      <Route path="c/:slug" element={<ComercioLayout />}>
        <Route index element={<Menu />} />
        <Route path="checkout" element={<Checkout />} />
      </Route>
      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  );
}
