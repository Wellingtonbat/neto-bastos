import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const URL_BASE = "http://localhost:3001"; // process.env.URL_BASE

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

async function parseResposta(res: Response) {
  if (res.ok) {
    const texto = await res.text();
    return texto ? JSON.parse(texto) : null;
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
  const httpGet = useCallback(async function (uri: string): Promise<any> {
    const res = await fetch(`${URL_BASE}/${uri}`, {
      headers: {
        ...(await obterHeadersAuth()),
      },
    });
    return parseResposta(res);
  }, []);

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
    return parseResposta(res);
  }, []);

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
    return parseResposta(res);
  }, []);

  const httpDelete = useCallback(async function (uri: string): Promise<any> {
    const res = await fetch(`${URL_BASE}/${uri}`, {
      method: "DELETE",
      headers: {
        ...(await obterHeadersAuth()),
      },
    });
    return parseResposta(res);
  }, []);

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
    return parseResposta(res);
  }, []);

  return { httpGet, httpPost, httpPatch, httpDelete, httpPostFormData };
}
