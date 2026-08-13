import { URL_BASE } from "./ambiente";

const imagens = {
  profissionais: [
    {
      id: 1,
      imagem: require("../../../assets/profissionais/profissional-1.jpg"),
    },
    {
      id: 2,
      imagem: require("../../../assets/profissionais/profissional-2.jpg"),
    },
    {
      id: 3,
      imagem: require("../../../assets/profissionais/profissional-3.jpg"),
    },
    {
      id: 4,
      imagem: require("../../../assets/profissionais/profissional-4.jpg"),
    },
    {
      id: 5,
      imagem: require("../../../assets/profissionais/profissional-5.jpg"),
    },
    {
      id: 6,
      imagem: require("../../../assets/profissionais/profissional-6.jpg"),
    },
  ],
  servicos: [
    {
      id: 1,
      imagem: require("../../../assets/servicos/corte-de-cabelo.jpg"),
    },
    {
      id: 2,
      imagem: require("../../../assets/servicos/corte-de-barba.jpg"),
    },
    {
      id: 3,
      imagem: require("../../../assets/servicos/manicure-pedicure.jpg"),
    },
    {
      id: 4,
      imagem: require("../../../assets/servicos/combo.jpg"),
    },
    {
      id: 5,
      imagem: require("../../../assets/servicos/corte-infantil.jpg"),
    },
    {
      id: 6,
      imagem: require("../../../assets/servicos/dia-de-noivo.jpg"),
    },
  ],
};

export default imagens;

type TipoImagem = "profissionais" | "servicos";

// Imagens do seed vivem no public do frontend; no app usamos as versoes empacotadas por id.
export function obterImagem(tipo: TipoImagem, id: number, imagemUrl?: string) {
  if (
    imagemUrl &&
    (imagemUrl.startsWith("http://") || imagemUrl.startsWith("https://"))
  ) {
    return { uri: imagemUrl };
  }

  const local = imagens[tipo].find((item) => item.id === id)?.imagem;
  if (local) return local;

  if (imagemUrl) {
    return { uri: `${URL_BASE}${imagemUrl}` };
  }

  return undefined;
}
