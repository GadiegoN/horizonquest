export function LoadingState({
  message = "Carregando...",
}: {
  message?: string;
}) {
  return (
    <div
      role="status"
      className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300"
    >
      <span className="mr-3 inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-blue-400 motion-reduce:animate-none" />
      {message}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-300"
    >
      <p>{message}</p>
      <button
        className="mt-2 text-sm underline"
        onClick={() => window.location.reload()}
      >
        Tentar novamente
      </button>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-neutral-700 p-6 text-neutral-400">
      {message}
    </p>
  );
}
