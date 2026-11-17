import { Link } from 'react-router';

export function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="text-stone-600">Puede que el comercio ya no esté disponible.</p>
      <Link to="/" className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white">
        Ver comercios
      </Link>
    </main>
  );
}
