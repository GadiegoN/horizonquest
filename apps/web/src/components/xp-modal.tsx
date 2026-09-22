import { HorizonMark } from "./brand";
import { useEffect, useRef } from "react";

export function XpModal({ xp, onClose }: { xp: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="xp-title"
      className="m-auto w-[min(90vw,380px)] rounded-xl border border-neutral-700 bg-neutral-900 p-8 text-center text-white backdrop:bg-black/70 animate-fadeIn"
    >
      <HorizonMark className="mx-auto mb-5 h-16 w-16 text-blue-400" />
      <h2 id="xp-title" className="mb-4 text-2xl font-bold text-green-400">
        Novo horizonte!
      </h2>
      <p className="mb-2 text-lg text-neutral-300">Sua aventura rendeu</p>
      <p className="xp-reward text-5xl font-extrabold text-green-400">
        +{xp} XP
      </p>
      <p className="mt-4 text-sm text-neutral-400">
        Seu perfil e rank foram atualizados.
      </p>
      <button
        autoFocus
        onClick={onClose}
        className="mt-6 rounded-md bg-blue-600 px-6 py-2 hover:bg-blue-500"
      >
        Continuar aventura
      </button>
    </dialog>
  );
}
