"use client";
import { useCallback } from "react";
import useUsuario from "./useUsuario";

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE;

// Login e Google-login sao os unicos endpoints nao autenticados que podem
// responder 401 por um motivo legitimo (senha/token errados) em vez de
// sessao expirada -- nao devem disparar o limparSessao abaixo.
const ROTAS_SEM_LIMPAR_SESSAO = ["auth/login", "auth/google"];

function obterHeadersAutenticacao(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const bruto = window.localStorage.getItem("usuario");
  if (!bruto) return {};

  try {
    const usuario = JSON.parse(bruto);
    if (!usuario?.token) return {};
    return { Authorization: `Bearer ${usuario.token}` };
  } catch {
    return {};
  }
}

async function parseResposta(
  res: Response,
  uri: string,
  aoSessaoExpirada: () => void,
) {
  if (res.ok) {
    const texto = await res.text();
    return texto ? JSON.parse(texto) : null;
  }

  if (res.status === 401 && !ROTAS_SEM_LIMPAR_SESSAO.includes(uri)) {
    aoSessaoExpirada();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  let mensagem = "Erro ao processar a requisicao.";
  try {
    const erro = await res.json();
    mensagem = erro?.message ?? mensagem;
  } catch {
    // Mantem mensagem padrao quando resposta nao for JSON.
  }
  throw new Error(Array.isArray(mensagem) ? mensagem.join(", ") : mensagem);
}

export default function useAPI() {
  const { limparSessao } = useUsuario();

  const httpGet = useCallback(async function (uri: string): Promise<any> {
    try {
      const res = await fetch(`${URL_BASE}/${uri}`, {
        headers: {
          ...obterHeadersAutenticacao(),
        },
      });
      return await parseResposta(res, uri, limparSessao);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, [limparSessao]);

  const httpPost = useCallback(async function (
    uri: string,
    body: any,
  ): Promise<any> {
    const res = await fetch(`${URL_BASE}/${uri}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...obterHeadersAutenticacao(),
      },
      body: JSON.stringify(body),
    });
    return parseResposta(res, uri, limparSessao);
  }, [limparSessao]);

  const httpPatch = useCallback(async function (
    uri: string,
    body: any,
  ): Promise<any> {
    const res = await fetch(`${URL_BASE}/${uri}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...obterHeadersAutenticacao(),
      },
      body: JSON.stringify(body),
    });
    return parseResposta(res, uri, limparSessao);
  }, [limparSessao]);

  const httpDelete = useCallback(async function (uri: string): Promise<any> {
    const res = await fetch(`${URL_BASE}/${uri}`, {
      method: "DELETE",
      headers: {
        ...obterHeadersAutenticacao(),
      },
    });
    return parseResposta(res, uri, limparSessao);
  }, [limparSessao]);

  return { httpGet, httpPost, httpPatch, httpDelete };
}
