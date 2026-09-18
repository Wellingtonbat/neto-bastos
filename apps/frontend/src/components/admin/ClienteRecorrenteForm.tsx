'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Profissional, Servico } from '@neto-bastos/core'
import useAPI from '@/data/hooks/useAPI'
import useServicos from '@/data/hooks/useServicos'
import { ClienteAdmin, DIAS_SEMANA } from './adminShared'

export interface ClienteRecorrenteFormProps {
    clientes: ClienteAdmin[]
    profissionaisAdmin: Profissional[]
}

interface SerieRecorrenteApi {
    id: number
    emailCliente: string
    nomeCliente: string
    diaSemana: number
    horario: string
    profissional: { id: number; nome: string }
    servicos: Servico[]
}

export default function ClienteRecorrenteForm(props: ClienteRecorrenteFormProps) {
    const { httpGet, httpPost, httpDelete } = useAPI()
    const { servicos: todosServicos } = useServicos()

    const [series, setSeries] = useState<SerieRecorrenteApi[]>([])
    const [carregando, setCarregando] = useState(false)
    const [erro, setErro] = useState('')

    const [emailCliente, setEmailCliente] = useState('')
    const [profissionalId, setProfissionalId] = useState('')
    const [diaSemana, setDiaSemana] = useState(6)
    const [horario, setHorario] = useState('08:00')
    const [servicoIds, setServicoIds] = useState<number[]>([])
    const [salvando, setSalvando] = useState(false)

    const clientesRecorrentes = useMemo(
        () => props.clientes.filter((c) => c.clienteRecorrente),
        [props.clientes]
    )

    const carregarSeries = useCallback(async () => {
        try {
            setCarregando(true)
            const dados = await httpGet('agendamentos-recorrentes')
            setSeries(dados ?? [])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel carregar os clientes fixos.')
        } finally {
            setCarregando(false)
        }
    }, [httpGet])

    useEffect(() => {
        carregarSeries()
    }, [carregarSeries])

    function alternarServico(id: number) {
        setServicoIds((atual) => (atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]))
    }

    async function criarSerie() {
        setErro('')

        const cliente = clientesRecorrentes.find((c) => c.email === emailCliente)
        if (!cliente) {
            setErro('Selecione um cliente marcado como fixo.')
            return
        }
        if (!profissionalId) {
            setErro('Selecione o barbeiro.')
            return
        }
        if (servicoIds.length === 0) {
            setErro('Selecione ao menos um serviço.')
            return
        }

        try {
            setSalvando(true)
            await httpPost('agendamentos-recorrentes', {
                emailCliente: cliente.email,
                nomeCliente: cliente.nome,
                telefoneCliente: cliente.telefone,
                profissionalId: Number(profissionalId),
                diaSemana,
                horario,
                servicoIds,
            })
            setEmailCliente('')
            setServicoIds([])
            await carregarSeries()
            window.alert('Cliente fixo cadastrado com sucesso.')
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel cadastrar o cliente fixo.')
        } finally {
            setSalvando(false)
        }
    }

    async function cancelarSerie(id: number) {
        if (!window.confirm('Cancelar este cliente fixo? Os próximos agendamentos dele serão cancelados.')) {
            return
        }
        try {
            await httpDelete(`agendamentos-recorrentes/${id}`)
            await carregarSeries()
        } catch (e: any) {
            window.alert(e?.message ?? 'Nao foi possivel cancelar.')
        }
    }

    return (
        <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
            <h2 className="text-xl font-bold text-zinc-100">Clientes fixos (horário recorrente)</h2>
            <p className="text-xs text-zinc-400">
                Só clientes marcados como &quot;fixo&quot; (na lista de clientes do agendamento) podem
                ter uma série recorrente. Os agendamentos são criados automaticamente já confirmados.
            </p>

            {erro ? <p className="text-sm text-red-400">{erro}</p> : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <select
                    value={emailCliente}
                    onChange={(e) => setEmailCliente(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                >
                    <option value="">Selecione o cliente fixo</option>
                    {clientesRecorrentes.map((c) => (
                        <option key={c.id} value={c.email}>
                            {c.nome} ({c.email})
                        </option>
                    ))}
                </select>

                <select
                    value={profissionalId}
                    onChange={(e) => setProfissionalId(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                >
                    <option value="">Selecione o barbeiro</option>
                    {props.profissionaisAdmin.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.nome}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map((dia) => (
                    <button
                        key={dia.valor}
                        type="button"
                        onClick={() => setDiaSemana(dia.valor)}
                        className={`px-3 py-2 rounded border ${
                            diaSemana === dia.valor
                                ? 'bg-green-600 text-white border-green-500'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                        }`}
                    >
                        {dia.label}
                    </button>
                ))}
                <input
                    type="time"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {todosServicos.map((servico) => (
                    <button
                        key={servico.id}
                        type="button"
                        onClick={() => alternarServico(servico.id)}
                        className={`px-3 py-2 rounded border text-sm ${
                            servicoIds.includes(servico.id)
                                ? 'bg-green-600 text-white border-green-500'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                        }`}
                    >
                        {servico.nome}
                    </button>
                ))}
            </div>

            <button
                onClick={criarSerie}
                disabled={salvando}
                className={`button ${salvando ? 'bg-zinc-600 cursor-not-allowed' : 'bg-green-600'}`}
            >
                {salvando ? 'Salvando...' : 'Cadastrar cliente fixo'}
            </button>

            <div className="border-t border-zinc-700 pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-zinc-200">Clientes fixos ativos</h3>
                {carregando ? (
                    <p className="text-sm text-zinc-500">Carregando...</p>
                ) : series.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nenhum cliente fixo cadastrado.</p>
                ) : (
                    series.map((serie) => (
                        <div
                            key={serie.id}
                            className="flex items-center justify-between border border-zinc-700 rounded px-3 py-2"
                        >
                            <span className="text-sm text-zinc-200">
                                {serie.nomeCliente} — {DIAS_SEMANA.find((d) => d.valor === serie.diaSemana)?.label}{' '}
                                {serie.horario} com {serie.profissional?.nome}
                            </span>
                            <button
                                onClick={() => cancelarSerie(serie.id)}
                                className="text-xs text-red-400 hover:text-red-300"
                            >
                                cancelar
                            </button>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
