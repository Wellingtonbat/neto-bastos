import { useEffect, useRef } from 'react'
import useProfissionais from '@/data/hooks/useProfissionais'
import { Profissional } from '@neto-bastos/core'
import Image from 'next/image'
import { resolverImagemUrl } from '@/lib/imagem'

export interface ProfissionalInputProps {
    profissional: Profissional | null
    profissionalMudou: (profissional: Profissional) => void
}

function Opcao(props: {
    profissional: Profissional
    onClick: (p: Profissional) => void
    selecionado?: boolean
}) {
    return (
        <div
            className={`
                flex flex-col items-center cursor-pointer select-none rounded-lg border w-[150px] h-[180px]
                ${props.selecionado ? 'border-green-400' : 'border-zinc-700'} overflow-hidden
            `}
            onClick={() => props.onClick(props.profissional)}
        >
            <Image
                src={resolverImagemUrl(props.profissional.imagemUrl)}
                alt={props.profissional.nome}
                width={150}
                height={150}
            />
            <div
                className={`
                    py-2 w-full h-full text-center text-xs
                    ${props.selecionado ? 'text-black bg-green-400 font-semibold' : 'text-zinc-400 font-light bg-zinc-900 '}
                `}
            >
                {props.profissional.nome.split(' ')[0]}
            </div>
        </div>
    )
}

export default function ProfissionalInput(props: ProfissionalInputProps) {
    const { profissionais } = useProfissionais()
    const profissionalRef = useRef(props.profissional)
    const profissionalMudouRef = useRef(props.profissionalMudou)
    profissionalRef.current = props.profissional
    profissionalMudouRef.current = props.profissionalMudou

    // Resincroniza o profissional ja selecionado com a lista atualizada --
    // sem isso, editar a agenda/tempo de slot dele no admin (em outra aba
    // ou apos voltar pra essa pagina) nao refletia aqui, pois o objeto
    // selecionado ficava congelado com os dados de quando foi clicado.
    useEffect(() => {
        const selecionado = profissionalRef.current
        if (!selecionado) return

        const atualizado = profissionais.find((p) => p.id === selecionado.id)
        if (atualizado && JSON.stringify(atualizado) !== JSON.stringify(selecionado)) {
            profissionalMudouRef.current(atualizado)
        }
    }, [profissionais])

    return (
        <div className="flex flex-col gap-5">
            <span className="text-sm uppercase text-zinc-400">Profissionais Disponíveis</span>
            <div className="grid grid-cols-2 md:grid-cols-3 self-start gap-5">
                {profissionais.map((profissional) => (
                    <Opcao
                        key={profissional.id}
                        profissional={profissional}
                        onClick={props.profissionalMudou}
                        selecionado={profissional.id === props.profissional?.id}
                    />
                ))}
            </div>
        </div>
    )
}
