"use client";

import {
  Profissional,
  profissionais as profissionaisFallback,
} from "@neto-bastos/core";
import { useEffect, useState } from "react";

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE;

export default function useProfissionais() {
  const [profissionais, setProfissionais] = useState<Profissional[]>(
    profissionaisFallback,
  );

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const res = await fetch(`${URL_BASE}/profissional`);
        if (!res.ok) return;
        const dados = await res.json();
        if (ativo && Array.isArray(dados) && dados.length > 0) {
          setProfissionais(dados);
        }
      } catch {
        // Mantem fallback local quando API indisponivel.
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, []);

  return {
    profissionais,
  };
}
