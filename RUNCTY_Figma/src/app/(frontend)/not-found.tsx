import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-8 py-16 text-center">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-violet-700">RUNCTY / 404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Este camino no está disponible.</h1>
      <p className="mt-4 text-zinc-600">
        La página o ruta que buscas no existe, es privada o todavía no está publicada.
      </p>
      <Link
        className="mt-6 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-800"
        href="/explorar"
      >
        Volver a explorar
      </Link>
    </main>
  )
}
