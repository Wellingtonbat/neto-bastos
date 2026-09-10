import { useState } from "react";
import useUsuario from "./useUsuario";
import useAPI from "./useAPI";

const TAMANHO_MINIMO_SENHA = 6;

export default function useFormUsuario() {
  const { entrar } = useUsuario();
  const { httpPost } = useAPI();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [errors, setErrors] = useState({
    nome: "",
    email: "",
    telefone: "",
    senha: "",
  });
  const [erroEnvio, setErroEnvio] = useState("");

  function validate() {
    let errors: any = {};

    if (!nome) {
      errors.nome = "Nome é obrigatório";
    }
    if (!email) {
      errors.email = "E-mail é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "E-mail inválido";
    }
    if (!telefone) {
      errors.telefone = "Telefone é obrigatório";
    } else if (!/^\d{10,11}$/.test(telefone)) {
      errors.telefone = "Telefone deve ter 10 ou 11 dígitos";
    }
    if (!senha) {
      errors.senha = "Senha é obrigatória";
    } else if (senha.length < TAMANHO_MINIMO_SENHA) {
      errors.senha = `A senha deve ter ao menos ${TAMANHO_MINIMO_SENHA} caracteres`;
    }

    setErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function cadastrar() {
    setErroEnvio("");
    if (validate()) {
      try {
        const usuarioAutenticado = await httpPost("auth/login", {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          telefone,
          senha,
        });
        await entrar(usuarioAutenticado);
      } catch (e: any) {
        setErroEnvio(e?.message ?? "Não foi possível entrar.");
        throw e;
      }
    }
  }

  return {
    nome,
    setNome,
    email,
    setEmail,
    telefone,
    setTelefone,
    senha,
    setSenha,
    errors,
    erroEnvio,
    cadastrar,
  };
}
