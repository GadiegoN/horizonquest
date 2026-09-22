import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-neutral-950 p-10 text-white">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p className="mt-4 text-neutral-400">
        Este endereço não está disponível.
      </p>
      <Link
        className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2"
        to="/dashboard"
      >
        Voltar ao painel
      </Link>
    </main>
  );
}
