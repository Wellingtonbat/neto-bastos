'use client'

import { useEffect, useState } from 'react'
import { Profissional } from '@neto-bastos/core'
import useAPI from '@/data/hooks/useAPI'
import useAgendamento from '@/data/hooks/useAgendamento'
import Passos from '@/components/shared/Passos'
import Sumario from '@/components/agendamento/Sumario'
import ClienteInput from '@/components/agendamento/ClienteInput'
import ProfissionalInput from '@/components/agendamento/ProfissionalInput'
import ServicosInput from '@/components/agendamento/ServicosInput'
import DataInput from '@/components/agendamento/DataInput'
import {
    AgendamentoComStatus,
    ClienteAdmin,
    STATUS_LABEL,
    StatusAgendamento,
} from './adminShared'

export interface AgendamentosTabProps {
    profissionaisAdmin: Profissional[]
}

type AcaoCarregando = 'ATUALIZAR_STATUS' | 'EXCLUIR_AGENDAMENTO' | null

function hojeYYYYMMDD() {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
}

export default function AgendamentosTab(props: AgendamentosTabProps) {
    const { profissionaisAdmin } = props
    const { httpGet, httpPatch, httpDelete } = useAPI()
    const {
        profissional,
        servicos,
        data,
        selecionarProfissional,
        selecionarServicos,
        selecionarData,
        quantidadeDeSlots,
    } = useAgendamento()

    const [agendamentos, setAgendamentos] = useState<AgendamentoComStatus[]>([])
    const [clientes, setClientes] = useState<ClienteAdmin[]>([])
    const [carregando, setCarregando] = useState(true)
    const [acaoCarregando, setAcaoCarregando] = useState<AcaoCarregando>(null)
    const [erro, setErro] = useState('')

    const [filtroStatus, setFiltroStatus] = useState<'TODOS' | StatusAgendamento>('TODOS')
    const [filtroProfissional, setFiltroProfissional] = useState<string>('todos')
    const [filtroData, setFiltroData] = useState<string>(hojeYYYYMMDD())

    const [clienteSelecionado, setClienteSelecionado] = useState<ClienteAdmin | null>(null)
    const [permiteProximoPasso, setPermiteProximoPasso] = useState(false)
    const [avancarAutomaticamente, setAvancarAutomaticamente] = useState(0)
    const [reiniciarPassos, setReiniciarPassos] = useState(0)

    function reportarErro(mensagem: string) {
        setErro(mensagem)
        window.alert(mensagem)
    }

    async function carregarClientes() {
        const data = await httpGet('auth/clientes')
        setClientes(data ?? [])
    }

    async function carregarAgendamentos() {
        const params = new URLSearchParams()
        if (filtroStatus !== 'TODOS') params.set('status', filtroStatus)
        if (filtroProfissional !== 'todos') params.set('profissionalId', filtroProfissional)
        if (filtroData) params.set('data', filtroData)

        const query = params.toString()
        const data = await httpGet(`agendamentos${query ? `?${query}` : ''}`)
        setAgendamentos(data ?? [])
    }

    async function carregarTudo() {
        try {
            setCarregando(true)
            setErro('')
            await Promise.all([carregarAgendamentos(), carregarClientes()])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel carregar os dados.')
        } finally {
            setCarregando(false)
        }
    }

    useEffect(() => {
        carregarTudo()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroStatus, filtroProfissional, filtroData])

    function clienteMudou(cliente: ClienteAdmin) {
        setClienteSelecionado(cliente)
        setAvancarAutomaticamente((valor) => valor + 1)
    }

    function profissionalMudou(profissional: Profissional) {
        selecionarProfissional(profissional)
        setPermiteProximoPasso(!!profissional)
        setAvancarAutomaticamente((valor) => valor + 1)
    }

    function servicosMudou(servicos: any[]) {
        selecionarServicos(servicos)
        setPermiteProximoPasso(servicos.length > 0)
        setAvancarAutomaticamente((valor) => valor + 1)
    }

    function dataMudou(data: Date) {
        selecionarData(data)
        const horaValida = data.getHours() >= 8 && data.getHours() <= 21
        setPermiteProximoPasso(horaValida)
    }

    function agendamentoCriadoComSucesso() {
        setClienteSelecionado(null)
        setPermiteProximoPasso(false)
        setReiniciarPassos((valor) => valor + 1)
        carregarAgendamentos()
    }

    async function atualizarStatus(id: number, status: StatusAgendamento) {
        try {
            setErro('')
            setAcaoCarregando('ATUALIZAR_STATUS')
            await httpPatch(`agendamentos/${id}/status`, { status })
            await carregarAgendamentos()
        } catch (e: any) {
            reportarErro(e?.message ?? 'Nao foi possivel atualizar o status.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function excluirAgendamento(id: number) {
        try {
            setErro('')
            setAcaoCarregando('EXCLUIR_AGENDAMENTO')
            await httpDelete(`agendamentos/${id}`)
            await carregarAgendamentos()
        } catch (e: any) {
            reportarErro(e?.message ?? 'Nao foi possivel excluir o agendamento.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    return (
        <>
            {acaoCarregando ? (
                <div className="bg-blue-900/30 border border-blue-700 text-blue-200 rounded px-4 py-3 mb-4">
                    Processando requisicao...
                </div>
            ) : null}

            {erro ? (
                <div className="bg-red-900/40 border border-red-700 text-red-200 rounded px-4 py-3 mb-4">
                    {erro}
                </div>
            ) : null}

            <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4 mb-6">
                <h2 className="text-xl font-bold text-zinc-100">Novo agendamento para cliente</h2>
                <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-8">
                    <Passos
                        permiteProximoPasso={permiteProximoPasso}
                        permiteProximoPassoMudou={setPermiteProximoPasso}
                        avancarAutomaticamente={avancarAutomaticamente}
                        reiniciar={reiniciarPassos}
                        labels={['Cliente', 'Profissional', 'Serviço', 'Horário']}
                    >
                        <ClienteInput
                            clientes={clientes}
                            cliente={clienteSelecionado}
                            clienteMudou={clienteMudou}
                        />
                        <ProfissionalInput
                            profissional={profissional}
                            profissionalMudou={profissionalMudou}
                        />
                        <ServicosInput servicos={servicos} servicosMudou={servicosMudou} />
                        <DataInput
                            data={data}
                            dataMudou={dataMudou}
                            quantidadeDeSlots={quantidadeDeSlots()}
                        />
                    </Passos>
                    <Sumario
                        emailCliente={clienteSelecionado?.email}
                        nomeCliente={clienteSelecionado?.nome ?? ''}
                        aoAgendarComSucesso={agendamentoCriadoComSucesso}
                    />
                </div>
            </section>

            <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <h2 className="text-xl font-bold text-zinc-100">Agenda dos barbeiros</h2>
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="date"
                            value={filtroData}
                            onChange={(e) => setFiltroData(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                        />
                        {filtroData ? (
                            <button
                                onClick={() => setFiltroData('')}
                                className="button bg-zinc-700"
                                type="button"
                            >
                                Ver todas as datas
                            </button>
                        ) : null}
                        <select
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value as any)}
                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                        >
                            <option value="TODOS">Todos os status</option>
                            <option value="PENDENTE">Pendentes</option>
                            <option value="CONFIRMADO">Confirmados</option>
                            <option value="CANCELADO">Cancelados</option>
                        </select>
                        <select
                            value={filtroProfissional}
                            onChange={(e) => setFiltroProfissional(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                        >
                            <option value="todos">Todos os barbeiros</option>
                            {profissionaisAdmin.map((p: Profissional) => (
                                <option key={p.id} value={p.id}>
                                    {p.nome}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {carregando ? (
                    <p className="text-zinc-400">Carregando agenda...</p>
                ) : agendamentos.length === 0 ? (
                    <p className="text-zinc-400">Nenhum agendamento encontrado.</p>
                ) : (
                    <div className="space-y-3">
                        {agendamentos.map((ag) => (
                            <div
                                key={ag.id}
                                className="bg-zinc-900 border border-zinc-700 rounded p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                            >
                                <div>
                                    <p className="font-semibold text-zinc-100">{ag.emailCliente}</p>
                                    <p className="text-zinc-400 text-sm">
                                        {new Date(ag.data).toLocaleString('pt-BR')} - {ag.profissional?.nome}
                                    </p>
                                    <p className="text-zinc-300 text-sm">
                                        {ag.servicos?.map((s) => s.nome).join(', ')}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs bg-zinc-700 rounded px-2 py-1">
                                        {STATUS_LABEL[ag.status ?? 'PENDENTE']}
                                    </span>
                                    {(ag.status ?? 'PENDENTE') === 'PENDENTE' ? (
                                        <>
                                            <button
                                                onClick={() => atualizarStatus(ag.id, 'CONFIRMADO')}
                                                disabled={!!acaoCarregando}
                                                className="button bg-green-700"
                                            >
                                                Confirmar
                                            </button>
                                            <button
                                                onClick={() => atualizarStatus(ag.id, 'CANCELADO')}
                                                disabled={!!acaoCarregando}
                                                className="button bg-amber-700"
                                            >
                                                Cancelar
                                            </button>
                                        </>
                                    ) : null}
                                    <button
                                        onClick={() => excluirAgendamento(ag.id)}
                                        disabled={!!acaoCarregando}
                                        className="button bg-red-700"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </>
    )
}
