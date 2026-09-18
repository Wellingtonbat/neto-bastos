'use client'

import { useState } from 'react'
import { QrCodeUtils } from '@neto-bastos/core'
import useAPI from '@/data/hooks/useAPI'
import { AgendamentoComStatus } from './adminShared'

export interface FinalizarAtendimentoModalProps {
    agendamento: AgendamentoComStatus
    aoConcluir: () => void
    aoFechar: () => void
}

interface DadosPix {
    payload: string
    valor: number
    nomeProfissional: string
}

type Etapa = 'ESCOLHA' | 'QR'

export default function FinalizarAtendimentoModal(props: FinalizarAtendimentoModalProps) {
    const { httpGet, httpPatch } = useAPI()
    const [etapa, setEtapa] = useState<Etapa>('ESCOLHA')
    const [carregando, setCarregando] = useState(false)
    const [erro, setErro] = useState('')
    const [dadosPix, setDadosPix] = useState<DadosPix | null>(null)
    const [svgQr, setSvgQr] = useState('')
    const [copiado, setCopiado] = useState(false)

    const valorTotal = props.agendamento.servicos.reduce((total, s) => total + s.preco, 0)

    async function escolherPix() {
        try {
            setCarregando(true)
            setErro('')
            const dados: DadosPix = await httpGet(`agendamentos/${props.agendamento.id}/pix`)
            setDadosPix(dados)
            setSvgQr(QrCodeUtils.gerarSvg(dados.payload))
            setEtapa('QR')
        } catch (e: any) {
            setErro(e?.message ?? 'Não foi possível gerar o Pix.')
        } finally {
            setCarregando(false)
        }
    }

    async function concluir() {
        try {
            setCarregando(true)
            setErro('')
            await httpPatch(`agendamentos/${props.agendamento.id}/status`, { status: 'CONCLUIDO' })
            props.aoConcluir()
        } catch (e: any) {
            setErro(e?.message ?? 'Não foi possível concluir o atendimento.')
        } finally {
            setCarregando(false)
        }
    }

    function escolherDinheiro() {
        if (
            !window.confirm(
                'Confirmar que o pagamento em dinheiro foi recebido e concluir o atendimento?'
            )
        ) {
            return
        }
        concluir()
    }

    function copiarPayload() {
        if (!dadosPix) return
        navigator.clipboard
            ?.writeText(dadosPix.payload)
            .then(() => {
                setCopiado(true)
                setTimeout(() => setCopiado(false), 1600)
            })
            .catch(() => {})
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-sm w-full space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-100">Finalizar atendimento</h3>
                    <button
                        onClick={props.aoFechar}
                        className="text-zinc-400 hover:text-zinc-200"
                        type="button"
                        aria-label="Fechar"
                    >
                        ✕
                    </button>
                </div>

                {erro ? <p className="text-sm text-red-400">{erro}</p> : null}

                {etapa === 'ESCOLHA' ? (
                    <>
                        <p className="text-sm text-zinc-300">
                            Cliente: <strong>{props.agendamento.emailCliente}</strong>
                            <br />
                            Total: <strong>R$ {valorTotal.toFixed(2)}</strong>
                        </p>
                        <p className="text-sm text-zinc-400">Deseja gerar o QR Code do Pix?</p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={escolherPix}
                                disabled={carregando}
                                className="button bg-green-600"
                                type="button"
                            >
                                {carregando ? 'Gerando...' : 'Sim, gerar QR Code (Pix)'}
                            </button>
                            <button
                                onClick={escolherDinheiro}
                                disabled={carregando}
                                className="button bg-zinc-700"
                                type="button"
                            >
                                Não, foi pago em dinheiro
                            </button>
                        </div>
                    </>
                ) : null}

                {etapa === 'QR' && dadosPix ? (
                    <>
                        <p className="text-sm text-zinc-300 text-center">
                            R$ {dadosPix.valor.toFixed(2)} para {dadosPix.nomeProfissional}
                        </p>
                        <div
                            className="bg-white rounded p-3 w-48 h-48 mx-auto [&_svg]:w-full [&_svg]:h-full"
                            dangerouslySetInnerHTML={{ __html: svgQr }}
                        />
                        <p className="text-xs text-zinc-500 text-center">
                            Peça para o cliente escanear com o app do banco dele.
                        </p>
                        <details className="text-xs">
                            <summary className="cursor-pointer text-zinc-400">Pix Copia e Cola</summary>
                            <div className="bg-zinc-900 border border-zinc-700 rounded p-2 mt-2 text-zinc-400 break-all max-h-20 overflow-y-auto">
                                {dadosPix.payload}
                            </div>
                            <button
                                onClick={copiarPayload}
                                className="button bg-zinc-700 text-xs mt-2 w-full"
                                type="button"
                            >
                                {copiado ? 'Copiado ✓' : 'Copiar código'}
                            </button>
                        </details>
                        <button
                            onClick={concluir}
                            disabled={carregando}
                            className="button bg-green-600"
                            type="button"
                        >
                            {carregando ? 'Concluindo...' : 'Já recebi o pagamento — concluir'}
                        </button>
                        <button
                            onClick={() => setEtapa('ESCOLHA')}
                            className="button bg-zinc-700 text-sm"
                            type="button"
                        >
                            ← voltar
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    )
}
