'use client';

import { useEffect, useState } from 'react';

const steps = [
  'Conectando con el agente…',
  'Rastreando prensa y redes…',
  'Analizando narrativa pública…',
  'Sintetizando hallazgos…',
  'Preparando briefing final…',
];

export function InvestigationLoading() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % steps.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent px-6 py-10 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-teal-400/60 border-t-transparent" />
      <p className="text-sm uppercase tracking-[0.25em] text-teal-300/80">Investigando sujeto</p>
      <p className="max-w-md text-base text-slate-200">{steps[index]}</p>
      <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-[pulse_1.4s_ease-in-out_infinite] bg-gradient-to-r from-teal-300 to-sky-400" />
      </div>
    </div>
  );
}
