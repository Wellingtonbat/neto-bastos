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
    const { httpGet } = useAPI()
    const [agendamentos, setAgendamentos] = useState<AgendamentoComStatus[]>([])
    const [erro, setErro] = useState('')

    useEffect(() => {
        async function carregar() {
            try {
                if (!usuario?.email) return
                const data = await httpGet('agendamentos/me')
                setAgendamentos(data ?? [])
            } catch (e: any) {
                setErro(e?.message ?? 'Nao foi possivel carregar seus agendamentos.')
            }
        }

        carregar()
    }, [httpGet, usuario?.email])

    const pendentes = useMemo(
        () => agendamentos.filter((a) => (a.status ?? 'PENDENTE') === 'PENDENTE'),
        [agendamentos]
    )

    const confirmados = useMemo(
        () => agendamentos.filter((a) => (a.status ?? 'PENDENTE') === 'CONFIRMADO'),
        [agendamentos]
    )

    function renderizarLista(titulo: string, dados: AgendamentoComStatus[]) {
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
                                className="bg-zinc-900 border border-zinc-700 rounded px-4 py-3"
                            >
                                <p className="text-zinc-100 font-semibold">{ag.profissional?.nome}</p>
                                <p className="text-zinc-400 text-sm">
                                    {new Date(ag.data).toLocaleString('pt-BR')}
                                </p>
                                <p className="text-zinc-300 text-sm">
                                    {ag.servicos?.map((s) => s.nome).join(', ')}
                                </p>
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
                descricao="Acompanhe seus agendamentos pendentes e confirmados."
            />

            <div className="container py-10 space-y-6">
                {erro ? (
                    <div className="bg-red-900/40 border border-red-700 text-red-200 rounded px-4 py-3">
                        {erro}
                    </div>
                ) : null}

                {renderizarLista('Pendentes', pendentes)}
                {renderizarLista('Confirmados', confirmados)}
            </div>
        </div>
    )
}
