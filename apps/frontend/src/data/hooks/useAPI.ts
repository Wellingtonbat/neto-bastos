import { useCallback } from "react";

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE;

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

async function parseResposta(res: Response) {
  if (res.ok) {
    const texto = await res.text();
    return texto ? JSON.parse(texto) : null;
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
  const httpGet = useCallback(async function (uri: string): Promise<any> {
    try {
      const res = await fetch(`${URL_BASE}/${uri}`, {
        headers: {
          ...obterHeadersAutenticacao(),
        },
      });
      return await parseResposta(res);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, []);

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
        ...obterHeadersAutenticacao(),
      },
      body: JSON.stringify(body),
    });
    return parseResposta(res);
  }, []);

  const httpDelete = useCallback(async function (uri: string): Promise<any> {
    const res = await fetch(`${URL_BASE}/${uri}`, {
      method: "DELETE",
      headers: {
        ...obterHeadersAutenticacao(),
      },
    });
    return parseResposta(res);
  }, []);

  return { httpGet, httpPost, httpPatch, httpDelete };
}
