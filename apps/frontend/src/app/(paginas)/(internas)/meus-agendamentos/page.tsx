'use client'

import { useEffect, useMemo, useState } from 'react'
import { Agendamento } from '@neto-bastos/core'
import Cabecalho from '@/components/shared/Cabecalho'
import useUsuario from '@/data/hooks/useUsuario'
import useAPI from '@/data/hooks/useAPI'

type StatusAgendamento = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO'

type AgendamentoComStatus = Agendamento & {
    id: number
    status?: StatusAgendamento
}

export default function PaginaMeusAgendamentos() {
    const { usuario } = useUsuario()
    const { httpGet, httpPatch } = useAPI()
    const [agendamentos, setAgendamentos] = useState<AgendamentoComStatus[]>([])
    const [erro, setErro] = useState('')
    const [cancelandoId, setCancelandoId] = useState<number | null>(null)

    async function carregar() {
        try {
            if (!usuario?.email) return
            const data = await httpGet('agendamentos/me')
            setAgendamentos(data ?? [])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel carregar seus agendamentos.')
        }
    }

    useEffect(() => {
        carregar()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuario?.email])

    async function cancelar(id: number) {
        if (!window.confirm('Deseja realmente cancelar este agendamento?')) return

        try {
            setErro('')
            setCancelandoId(id)
            await httpPatch(`agendamentos/${id}/status`, { status: 'CANCELADO' })
            await carregar()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel cancelar o agendamento.')
        } finally {
            setCancelandoId(null)
        }
    }

    const pendentes = useMemo(
        () => agendamentos.filter((a) => (a.status ?? 'PENDENTE') === 'PENDENTE'),
        [agendamentos]
    )

    const confirmados = useMemo(
        () => agendamentos.filter((a) => (a.status ?? 'PENDENTE') === 'CONFIRMADO'),
        [agendamentos]
    )

    const cancelados = useMemo(
        () => agendamentos.filter((a) => a.status === 'CANCELADO'),
        [agendamentos]
    )

    function renderizarLista(
        titulo: string,
        dados: AgendamentoComStatus[],
        permiteCancelar: boolean
    ) {
        return (
            <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-3">
                <h2 className="text-xl font-bold text-zinc-100">{titulo}</h2>
                {dados.length === 0 ? (
                    <p className="text-zinc-400">Nenhum registro.</p>
                ) : (
                    <div className="space-y-3">
                        {dados.map((ag) => (
                            <div
                                key={ag.id}
                                className="bg-zinc-900 border border-zinc-700 rounded px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            >
                                <div>
                                    <p className="text-zinc-100 font-semibold">{ag.profissional?.nome}</p>
                                    <p className="text-zinc-400 text-sm">
                                        {new Date(ag.data).toLocaleString('pt-BR')}
                                    </p>
                                    <p className="text-zinc-300 text-sm">
                                        {ag.servicos?.map((s) => s.nome).join(', ')}
                                    </p>
                                </div>
                                {permiteCancelar ? (
                                    <button
                                        onClick={() => cancelar(ag.id)}
                                        disabled={cancelandoId === ag.id}
                                        className="button bg-red-700 self-start sm:self-auto"
                                    >
                                        {cancelandoId === ag.id ? 'Cancelando...' : 'Cancelar'}
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        )
    }

    return (
        <div className="bg-zinc-900 min-h-screen">
            <Cabecalho
                titulo="Meus Agendamentos"
                descricao="Acompanhe seus agendamentos pendentes, confirmados e cancelados."
            />

            <div className="container py-10 space-y-6">
                {erro ? (
                    <div className="bg-red-900/40 border border-red-700 text-red-200 rounded px-4 py-3">
                        {erro}
                    </div>
                ) : null}

                {renderizarLista('Pendentes', pendentes, true)}
                {renderizarLista('Confirmados', confirmados, true)}
                {renderizarLista('Cancelados', cancelados, false)}
            </div>
        </div>
    )
}
