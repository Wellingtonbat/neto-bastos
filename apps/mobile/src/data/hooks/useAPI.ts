import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { URL_BASE } from "../constants/ambiente";
import useUsuario from "./useUsuario";

// Login e Google-login sao os unicos endpoints nao autenticados que podem
// responder 401 por um motivo legitimo (senha/token errados) em vez de
// sessao expirada -- nao devem disparar o limparSessao abaixo.
const ROTAS_SEM_LIMPAR_SESSAO = ["auth/login", "auth/google"];

async function obterHeadersAuth() {
  const headers: Record<string, string> = {};
  const bruto = await AsyncStorage.getItem("usuario");
  if (!bruto) return headers;

  try {
    const usuario = JSON.parse(bruto);
    if (!usuario?.token) return headers;
    headers.Authorization = `Bearer ${usuario.token}`;
    return headers;
  } catch {
    return headers;
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
    mensagem = Array.isArray(erro?.message)
      ? erro.message.join(", ")
      : (erro?.message ?? mensagem);
  } catch {
    // Mantem mensagem padrao.
  }

  throw new Error(mensagem);
}

export default function useAPI() {
  const { limparSessao } = useUsuario();

  const httpGet = useCallback(async function (uri: string): Promise<any> {
    const res = await fetch(`${URL_BASE}/${uri}`, {
      headers: {
        ...(await obterHeadersAuth()),
      },
    });
    return parseResposta(res, uri, limparSessao);
  }, [limparSessao]);

  const httpPost = useCallback(async function (
    uri: string,
    body: any,
  ): Promise<any> {
    const res = await fetch(`${URL_BASE}/${uri}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await obterHeadersAuth()),
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
        ...(await obterHeadersAuth()),
      },
      body: JSON.stringify(body),
    });
    return parseResposta(res, uri, limparSessao);
  }, [limparSessao]);

  const httpDelete = useCallback(async function (uri: string): Promise<any> {
    const res = await fetch(`${URL_BASE}/${uri}`, {
      method: "DELETE",
      headers: {
        ...(await obterHeadersAuth()),
      },
    });
    return parseResposta(res, uri, limparSessao);
  }, [limparSessao]);

  const httpPostFormData = useCallback(async function (
    uri: string,
    formData: FormData,
  ): Promise<any> {
    const res = await fetch(`${URL_BASE}/${uri}`, {
      method: "POST",
      headers: {
        ...(await obterHeadersAuth()),
      },
      body: formData,
    });
    return parseResposta(res, uri, limparSessao);
  }, [limparSessao]);

  return { httpGet, httpPost, httpPatch, httpDelete, httpPostFormData };
}
