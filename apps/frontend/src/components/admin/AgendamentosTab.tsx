'use client'

import { useEffect, useMemo, useState } from 'react'
import { Profissional, Servico } from '@neto-bastos/core'
import useAPI from '@/data/hooks/useAPI'
import {
    AgendamentoComStatus,
    ClienteAdmin,
    STATUS_LABEL,
    StatusAgendamento,
} from './adminShared'

export interface AgendamentosTabProps {
    profissionaisAdmin: Profissional[]
}

type AcaoCarregando =
    | 'CRIAR_AGENDAMENTO'
    | 'ATUALIZAR_STATUS'
    | 'EXCLUIR_AGENDAMENTO'
    | null

export default function AgendamentosTab(props: AgendamentosTabProps) {
    const { profissionaisAdmin } = props
    const { httpGet, httpPost, httpPatch, httpDelete } = useAPI()

    const [agendamentos, setAgendamentos] = useState<AgendamentoComStatus[]>([])
    const [clientes, setClientes] = useState<ClienteAdmin[]>([])
    const [servicos, setServicos] = useState<Servico[]>([])
    const [carregando, setCarregando] = useState(true)
    const [acaoCarregando, setAcaoCarregando] = useState<AcaoCarregando>(null)
    const [erro, setErro] = useState('')

    const [filtroStatus, setFiltroStatus] = useState<'TODOS' | StatusAgendamento>('TODOS')
    const [filtroProfissional, setFiltroProfissional] = useState<string>('todos')

    const [clienteIdSelecionado, setClienteIdSelecionado] = useState('')
    const [filtroCliente, setFiltroCliente] = useState('')
    const [nomeCliente, setNomeCliente] = useState('')
    const [emailCliente, setEmailCliente] = useState('')
    const [telefoneCliente, setTelefoneCliente] = useState('')
    const [profissionalId, setProfissionalId] = useState<string>('')
    const [dataHora, setDataHora] = useState('')
    const [servicosSelecionados, setServicosSelecionados] = useState<number[]>([])

    const clientesFiltrados = useMemo(() => {
        const termo = filtroCliente.trim().toLowerCase()
        if (!termo) return clientes

        return clientes.filter((cliente) => {
            return (
                cliente.nome.toLowerCase().includes(termo) ||
                cliente.email.toLowerCase().includes(termo)
            )
        })
    }, [clientes, filtroCliente])

    async function carregarServicos() {
        const data = await httpGet('servico')
        setServicos(data ?? [])
    }

    async function carregarClientes() {
        const data = await httpGet('auth/clientes')
        setClientes(data ?? [])
    }

    async function carregarAgendamentos() {
        const params = new URLSearchParams()
        if (filtroStatus !== 'TODOS') params.set('status', filtroStatus)
        if (filtroProfissional !== 'todos') params.set('profissionalId', filtroProfissional)

        const query = params.toString()
        const data = await httpGet(`agendamentos${query ? `?${query}` : ''}`)
        setAgendamentos(data ?? [])
    }

    async function carregarTudo() {
        try {
            setCarregando(true)
            setErro('')
            await Promise.all([carregarServicos(), carregarAgendamentos(), carregarClientes()])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel carregar os dados.')
        } finally {
            setCarregando(false)
        }
    }

    useEffect(() => {
        carregarTudo()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroStatus, filtroProfissional])

    function selecionarCliente(clienteId: string) {
        setClienteIdSelecionado(clienteId)
        const cliente = clientes.find((c) => String(c.id) === clienteId)

        if (!cliente) {
            setNomeCliente('')
            setEmailCliente('')
            setTelefoneCliente('')
            return
        }

        setNomeCliente(cliente.nome)
        setEmailCliente(cliente.email)
        setTelefoneCliente(cliente.telefone ?? '')
    }

    function alternarServico(id: number) {
        setServicosSelecionados((atual) =>
            atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]
        )
    }

    async function criarAgendamento() {
        try {
            setErro('')
            setAcaoCarregando('CRIAR_AGENDAMENTO')
            if (!emailCliente || !profissionalId || !dataHora || servicosSelecionados.length === 0) {
                setErro('Preencha todos os campos para agendar.')
                return
            }

            await httpPost('agendamentos', {
                emailCliente,
                data: new Date(dataHora),
                profissional: { id: Number(profissionalId) },
                servicos: servicosSelecionados.map((id) => ({ id })),
            })

            setClienteIdSelecionado('')
            setFiltroCliente('')
            setNomeCliente('')
            setEmailCliente('')
            setTelefoneCliente('')
            setProfissionalId('')
            setDataHora('')
            setServicosSelecionados([])
            await carregarAgendamentos()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel criar o agendamento.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function atualizarStatus(id: number, status: StatusAgendamento) {
        try {
            setErro('')
            setAcaoCarregando('ATUALIZAR_STATUS')
            await httpPatch(`agendamentos/${id}/status`, { status })
            await carregarAgendamentos()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel atualizar o status.')
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
            setErro(e?.message ?? 'Nao foi possivel excluir o agendamento.')
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <input
                        value={filtroCliente}
                        onChange={(e) => setFiltroCliente(e.target.value)}
                        placeholder="Buscar cliente por nome ou e-mail"
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 lg:col-span-2"
                    />

                    <select
                        value={clienteIdSelecionado}
                        onChange={(e) => selecionarCliente(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                    >
                        <option value="">Selecione o cliente</option>
                        {clientesFiltrados.map((cliente) => (
                            <option key={cliente.id} value={cliente.id}>
                                {cliente.nome} - {cliente.email}
                            </option>
                        ))}
                    </select>

                    <input
                        value={nomeCliente}
                        readOnly
                        placeholder="Nome do cliente"
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-300"
                    />

                    <input
                        value={emailCliente}
                        readOnly
                        placeholder="E-mail do cliente"
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-300"
                    />

                    <input
                        value={telefoneCliente}
                        readOnly
                        placeholder="Telefone do cliente"
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-300"
                    />

                    <select
                        value={profissionalId}
                        onChange={(e) => setProfissionalId(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                    >
                        <option value="">Selecione o barbeiro</option>
                        {profissionaisAdmin.map((p: Profissional) => (
                            <option key={p.id} value={p.id}>
                                {p.nome}
                            </option>
                        ))}
                    </select>
                    <input
                        type="datetime-local"
                        value={dataHora}
                        onChange={(e) => setDataHora(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {servicos.map((s) => (
                        <label
                            key={s.id}
                            className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                        >
                            <input
                                type="checkbox"
                                checked={servicosSelecionados.includes(s.id)}
                                onChange={() => alternarServico(s.id)}
                            />
                            <span>{s.nome}</span>
                        </label>
                    ))}
                </div>

                <button onClick={criarAgendamento} className="button bg-green-600">
                    {acaoCarregando === 'CRIAR_AGENDAMENTO' ? 'Agendando...' : 'Agendar para cliente'}
                </button>
            </section>

            <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <h2 className="text-xl font-bold text-zinc-100">Agenda dos barbeiros</h2>
                    <div className="flex gap-2">
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
