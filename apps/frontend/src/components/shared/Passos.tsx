import { IconChevronLeft } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

export interface PassosProps {
    labels: string[]
    children: any
    permiteProximoPasso: boolean
    permiteProximoPassoMudou(valor: boolean): void
    avancarAutomaticamente?: number
}

export default function Passos(props: PassosProps) {
    const [passoAtual, setPassoAtual] = useState(0)
    const ultimoSinalAvanco = useRef(props.avancarAutomaticamente)

    useEffect(() => {
        if (props.avancarAutomaticamente === undefined) return
        if (ultimoSinalAvanco.current === props.avancarAutomaticamente) return
        ultimoSinalAvanco.current = props.avancarAutomaticamente

        setPassoAtual((atual) => Math.min(atual + 1, (props.children?.length ?? 1) - 1))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.avancarAutomaticamente])

    function passoAnterior() {
        setPassoAtual(passoAtual - 1)
        props.permiteProximoPassoMudou(true)
    }

    function renderizarPassos() {
        return (
            <div className="flex flex-col md:flex-row gap-4 md:gap-7">
                {props.labels.map((label, i) => {
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <span
                                key={i}
                                className={`
                                    flex justify-center items-center w-9 h-9 p-1 rounded-full font-bold
                                    ${i === passoAtual ? 'bg-white text-black' : 'text-zinc-500 bg-zinc-700'}
                                `}
                            >
                                {i + 1}
                            </span>
                            <span className={i === passoAtual ? 'text-white' : 'text-zinc-700'}>
                                {label}
                            </span>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-10 items-stretch w-full lg:w-auto">
            <div>{renderizarPassos()}</div>
            <div>{props.children?.[passoAtual] ?? props.children}</div>
            <div className="flex gap-3 select-none">
                <button
                    onClick={passoAnterior}
                    disabled={passoAtual === 0}
                    className="flex gap-1 items-center bg-zinc-700 text-sm text-white px-4 py-1.5 rounded-md disabled:opacity-30"
                >
                    <IconChevronLeft size={20} />
                    <span>Anterior</span>
                </button>
            </div>
        </div>
    )
}
