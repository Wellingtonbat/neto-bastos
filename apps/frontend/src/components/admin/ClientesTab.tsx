'use client'

import { useEffect, useMemo, useState } from 'react'
import { Profissional, Servico } from '@neto-bastos/core'
import useAPI from '@/data/hooks/useAPI'
import useAgendamento from '@/data/hooks/useAgendamento'
import useServicos from '@/data/hooks/useServicos'
import SeletorHora from '@/components/shared/SeletorHora'
import Passos from '@/components/shared/Passos'
import Sumario from '@/components/agendamento/Sumario'
import ProfissionalInput from '@/components/agendamento/ProfissionalInput'
import ServicosInput from '@/components/agendamento/ServicosInput'
import DataInput from '@/components/agendamento/DataInput'
import { ClienteAdmin, DIAS_SEMANA } from './adminShared'

export interface ClientesTabProps {
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

export default function ClientesTab(props: ClientesTabProps) {
    const { httpGet, httpPatch, httpPost, httpDelete } = useAPI()
    const { servicos: todosServicos } = useServicos()
    const {
        profissional,
        servicos,
        data,
        selecionarProfissional,
        selecionarServicos,
        selecionarData,
        quantidadeDeSlots,
    } = useAgendamento()

    const [clientes, setClientes] = useState<ClienteAdmin[]>([])
    const [carregandoClientes, setCarregandoClientes] = useState(true)
    const [filtro, setFiltro] = useState('')
    const [clienteSelecionado, setClienteSelecionado] = useState<ClienteAdmin | null>(null)

    const [permiteProximoPasso, setPermiteProximoPasso] = useState(false)
    const [avancarAutomaticamente, setAvancarAutomaticamente] = useState(0)
    const [reiniciarPassos, setReiniciarPassos] = useState(0)

    const [series, setSeries] = useState<SerieRecorrenteApi[]>([])
    const [carregandoSeries, setCarregandoSeries] = useState(false)
    const [profissionalIdRecorrente, setProfissionalIdRecorrente] = useState('')
    const [diaSemana, setDiaSemana] = useState(6)
    const [horarioRecorrente, setHorarioRecorrente] = useState('08:00')
    const [servicoIdsRecorrente, setServicoIdsRecorrente] = useState<number[]>([])
    const [salvandoSerie, setSalvandoSerie] = useState(false)

    const [resetandoSenha, setResetandoSenha] = useState(false)

    function reportarErro(mensagem: string) {
        window.alert(mensagem)
    }

    async function carregarClientes() {
        try {
            setCarregandoClientes(true)
            const dados = await httpGet('auth/clientes')
            setClientes(dados ?? [])
        } catch (e: any) {
            reportarErro(e?.message ?? 'Nao foi possivel carregar os clientes.')
        } finally {
            setCarregandoClientes(false)
        }
    }

    useEffect(() => {
        carregarClientes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const clientesFiltrados = useMemo(() => {
        const termo = filtro.trim().toLowerCase()
        if (!termo) return clientes
        return clientes.filter(
            (cliente) =>
                cliente.nome.toLowerCase().includes(termo) ||
                cliente.email.toLowerCase().includes(termo)
        )
    }, [clientes, filtro])

    async function carregarSeries() {
        try {
            setCarregandoSeries(true)
            const dados = await httpGet('agendamentos-recorrentes')
            setSeries(dados ?? [])
        } catch (e: any) {
            reportarErro(e?.message ?? 'Nao foi possivel carregar os clientes fixos.')
        } finally {
            setCarregandoSeries(false)
        }
    }

    function selecionarCliente(cliente: ClienteAdmin) {
        setClienteSelecionado(cliente)
        setPermiteProximoPasso(false)
        setReiniciarPassos((valor) => valor + 1)
        setProfissionalIdRecorrente('')
        setServicoIdsRecorrente([])
        carregarSeries()
    }

    async function alternarClienteRecorrente(cliente: ClienteAdmin) {
        try {
            const atualizado = await httpPatch(`auth/clientes/${cliente.id}/recorrente`, {
                clienteRecorrente: !cliente.clienteRecorrente,
            })
            setClientes((atual) => atual.map((c) => (c.id === cliente.id ? atualizado : c)))
            setClienteSelecionado((atual) => (atual?.id === cliente.id ? atualizado : atual))
        } catch (e: any) {
            reportarErro(e?.message ?? 'Nao foi possivel atualizar o cliente.')
        }
    }

    function profissionalMudou(p: Profissional) {
        selecionarProfissional(p)
        setPermiteProximoPasso(!!p)
        setAvancarAutomaticamente((valor) => valor + 1)
    }

    function servicosMudou(s: any[]) {
        selecionarServicos(s)
        setPermiteProximoPasso(s.length > 0)
        setAvancarAutomaticamente((valor) => valor + 1)
    }

    function dataMudou(d: Date) {
        selecionarData(d)
        const horaValida = d.getHours() >= 8 && d.getHours() <= 21
        setPermiteProximoPasso(horaValida)
    }

    function agendamentoCriadoComSucesso() {
        setPermiteProximoPasso(false)
        setReiniciarPassos((valor) => valor + 1)
        window.alert('Agendamento criado com sucesso.')
    }

    function alternarServicoRecorrente(id: number) {
        setServicoIdsRecorrente((atual) =>
            atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]
        )
    }

    async function criarSerie() {
        if (!clienteSelecionado) return
        if (!clienteSelecionado.clienteRecorrente) {
            reportarErro('Marque o cliente como fixo antes de cadastrar uma série.')
            return
        }
        if (!profissionalIdRecorrente) {
            reportarErro('Selecione o barbeiro.')
            return
        }
        if (servicoIdsRecorrente.length === 0) {
            reportarErro('Selecione ao menos um serviço.')
            return
        }

        try {
            setSalvandoSerie(true)
            const serie = await httpPost('agendamentos-recorrentes', {
                emailCliente: clienteSelecionado.email,
                nomeCliente: clienteSelecionado.nome,
                telefoneCliente: clienteSelecionado.telefone,
                profissionalId: Number(profissionalIdRecorrente),
                diaSemana,
                horario: horarioRecorrente,
                servicoIds: servicoIdsRecorrente,
            })
            setServicoIdsRecorrente([])
            await carregarSeries()
            const datasComConflito: string[] = serie?.datasComConflito ?? []
            if (datasComConflito.length > 0) {
                window.alert(
                    `Cliente fixo cadastrado, mas ${datasComConflito.length} data(s) já tinham agendamento e foram puladas: ${datasComConflito.join(', ')}.`
                )
            } else {
                window.alert('Cliente fixo cadastrado com sucesso.')
            }
        } catch (e: any) {
            reportarErro(e?.message ?? 'Nao foi possivel cadastrar o cliente fixo.')
        } finally {
            setSalvandoSerie(false)
        }
    }

    async function cancelarSerie(id: number) {
        if (
            !window.confirm(
                'Cancelar este cliente fixo? Os próximos agendamentos dele serão cancelados.'
            )
        ) {
            return
        }
        try {
            await httpDelete(`agendamentos-recorrentes/${id}`)
            await carregarSeries()
        } catch (e: any) {
            reportarErro(e?.message ?? 'Nao foi possivel cancelar.')
        }
    }

    async function resetarSenha() {
        if (!clienteSelecionado) return
        if (
            !window.confirm(
                `Resetar a senha de ${clienteSelecionado.nome}? Na próxima vez que entrar, ele(a) vai definir uma senha nova.`
            )
        ) {
            return
        }
        try {
            setResetandoSenha(true)
            await httpPatch(`auth/usuarios/${clienteSelecionado.id}/resetar-senha`, {})
            window.alert('Senha resetada com sucesso.')
        } catch (e: any) {
            reportarErro(e?.message ?? 'Nao foi possivel resetar a senha.')
        } finally {
            setResetandoSenha(false)
        }
    }

    const seriesDoCliente = useMemo(
        () => series.filter((s) => s.emailCliente === clienteSelecionado?.email),
        [series, clienteSelecionado]
    )

    return (
        <div className="flex flex-col lg:flex-row items-start gap-6">
            <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-3 w-full lg:w-80 lg:shrink-0">
                <h2 className="text-xl font-bold text-zinc-100">Clientes</h2>
                <input
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    placeholder="Buscar por nome ou e-mail"
                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 w-full"
                />
                <div className="flex flex-col gap-2 max-h-[32rem] overflow-y-auto">
                    {carregandoClientes ? (
                        <p className="text-zinc-500 text-sm">Carregando...</p>
                    ) : clientesFiltrados.length === 0 ? (
                        <p className="text-zinc-500 text-sm">Nenhum cliente encontrado.</p>
                    ) : (
                        clientesFiltrados.map((cliente) => (
                            <button
                                key={cliente.id}
                                type="button"
                                onClick={() => selecionarCliente(cliente)}
                                className={`text-left border rounded-lg px-4 py-3 transition-colors ${
                                    clienteSelecionado?.id === cliente.id
                                        ? 'border-green-400 bg-green-400/10'
                                        : 'border-zinc-700 bg-zinc-900'
                                }`}
                            >
                                <p className="text-sm text-white">{cliente.nome}</p>
                                <p className="text-xs text-zinc-400">{cliente.email}</p>
                                {cliente.clienteRecorrente ? (
                                    <span className="text-xs text-green-400">✓ Cliente fixo</span>
                                ) : null}
                            </button>
                        ))
                    )}
                </div>
            </section>

            {!clienteSelecionado ? (
                <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 flex-1">
                    <p className="text-zinc-400">
                        Selecione um cliente na lista para agendar, cadastrar como fixo ou resetar a senha.
                    </p>
                </section>
            ) : (
                <div className="flex-1 w-full space-y-6">
                    <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-zinc-100">
                                    {clienteSelecionado.nome}
                                </h2>
                                <p className="text-sm text-zinc-400">{clienteSelecionado.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => alternarClienteRecorrente(clienteSelecionado)}
                                    className={`text-xs px-3 py-2 rounded border whitespace-nowrap ${
                                        clienteSelecionado.clienteRecorrente
                                            ? 'border-green-500 text-green-400 bg-green-500/10'
                                            : 'border-zinc-600 text-zinc-400'
                                    }`}
                                >
                                    {clienteSelecionado.clienteRecorrente
                                        ? '✓ Cliente fixo'
                                        : 'Marcar como fixo'}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetarSenha}
                                    disabled={resetandoSenha}
                                    className="button bg-amber-700"
                                >
                                    {resetandoSenha ? 'Resetando...' : 'Resetar senha'}
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                        <h3 className="text-lg font-bold text-zinc-100">Agendar para este cliente</h3>
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-8">
                            <Passos
                                permiteProximoPasso={permiteProximoPasso}
                                permiteProximoPassoMudou={setPermiteProximoPasso}
                                avancarAutomaticamente={avancarAutomaticamente}
                                reiniciar={reiniciarPassos}
                                labels={['Profissional', 'Serviço', 'Horário']}
                            >
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
                                emailCliente={clienteSelecionado.email}
                                nomeCliente={clienteSelecionado.nome}
                                aoAgendarComSucesso={agendamentoCriadoComSucesso}
                            />
                        </div>
                    </section>

                    <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                        <h3 className="text-lg font-bold text-zinc-100">Cliente fixo (horário recorrente)</h3>
                        {!clienteSelecionado.clienteRecorrente ? (
                            <p className="text-xs text-zinc-400">
                                Marque o cliente como fixo (botão acima) para poder cadastrar uma série
                                recorrente.
                            </p>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <select
                                        value={profissionalIdRecorrente}
                                        onChange={(e) => setProfissionalIdRecorrente(e.target.value)}
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
                                    <SeletorHora
                                        value={horarioRecorrente}
                                        onChange={setHorarioRecorrente}
                                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-left"
                                    />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {todosServicos.map((servico) => (
                                        <button
                                            key={servico.id}
                                            type="button"
                                            onClick={() => alternarServicoRecorrente(servico.id)}
                                            className={`px-3 py-2 rounded border text-sm ${
                                                servicoIdsRecorrente.includes(servico.id)
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
                                    disabled={salvandoSerie}
                                    className={`button ${salvandoSerie ? 'bg-zinc-600 cursor-not-allowed' : 'bg-green-600'}`}
                                >
                                    {salvandoSerie ? 'Salvando...' : 'Cadastrar série recorrente'}
                                </button>
                            </>
                        )}

                        <div className="border-t border-zinc-700 pt-4 space-y-2">
                            <h4 className="text-sm font-semibold text-zinc-200">Séries ativas deste cliente</h4>
                            {carregandoSeries ? (
                                <p className="text-sm text-zinc-500">Carregando...</p>
                            ) : seriesDoCliente.length === 0 ? (
                                <p className="text-sm text-zinc-500">Nenhuma série recorrente cadastrada.</p>
                            ) : (
                                seriesDoCliente.map((serie) => (
                                    <div
                                        key={serie.id}
                                        className="flex items-center justify-between border border-zinc-700 rounded px-3 py-2"
                                    >
                                        <span className="text-sm text-zinc-200">
                                            {DIAS_SEMANA.find((d) => d.valor === serie.diaSemana)?.label}{' '}
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
                </div>
            )}
        </div>
    )
}
