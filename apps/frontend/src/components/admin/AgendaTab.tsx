'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Profissional, Usuario } from '@neto-bastos/core'
import useAPI from '@/data/hooks/useAPI'
import { DIAS_SEMANA } from './adminShared'

const REGEX_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/

interface DiaSemanalForm {
    ativo: boolean
    horaInicio: string
    horaFim: string
    tempoSlotMinutos: string
    temAlmoco: boolean
    horaAlmocoInicio: string
    horaAlmocoFim: string
}

interface HorarioSemanalApi {
    diaSemana: number
    horaInicio: string
    horaFim: string
    horaAlmocoInicio: string | null
    horaAlmocoFim: string | null
    tempoSlotMinutos: number | null
}

interface ExcecaoAgendaApi {
    id: number
    data: string
    fechado: boolean
    horaInicio: string | null
    horaFim: string | null
    horaAlmocoInicio: string | null
    horaAlmocoFim: string | null
    tempoSlotMinutos: number | null
}

function diaSemanalPadrao(): DiaSemanalForm {
    return {
        ativo: false,
        horaInicio: '08:00',
        horaFim: '19:00',
        tempoSlotMinutos: '',
        temAlmoco: false,
        horaAlmocoInicio: '12:00',
        horaAlmocoFim: '13:00',
    }
}

function validarJanela(
    horaInicio: string,
    horaFim: string,
    temAlmoco: boolean,
    horaAlmocoInicio: string,
    horaAlmocoFim: string
): string {
    if (!REGEX_HORA.test(horaInicio) || !REGEX_HORA.test(horaFim)) {
        return 'Informe horarios validos no formato HH:mm.'
    }
    const inicio = Number(horaInicio.slice(0, 2)) * 60 + Number(horaInicio.slice(3, 5))
    const fim = Number(horaFim.slice(0, 2)) * 60 + Number(horaFim.slice(3, 5))
    if (fim <= inicio) return 'A hora fim deve ser maior que a hora inicio.'

    if (!temAlmoco) return ''
    if (!REGEX_HORA.test(horaAlmocoInicio) || !REGEX_HORA.test(horaAlmocoFim)) {
        return 'Informe um horario de almoco valido no formato HH:mm.'
    }
    const almocoInicio = Number(horaAlmocoInicio.slice(0, 2)) * 60 + Number(horaAlmocoInicio.slice(3, 5))
    const almocoFim = Number(horaAlmocoFim.slice(0, 2)) * 60 + Number(horaAlmocoFim.slice(3, 5))
    if (almocoFim <= almocoInicio) return 'O fim do almoco deve ser maior que o inicio.'
    if (almocoInicio < inicio || almocoFim > fim) {
        return 'O horario de almoco deve estar dentro da janela de atendimento.'
    }
    return ''
}

export interface AgendaTabProps {
    profissionaisAdmin: Profissional[]
    usuario: Usuario | null
    onProfissionalAtualizado: (atualizado: Profissional) => void
}

export default function AgendaTab(props: AgendaTabProps) {
    const { profissionaisAdmin, usuario, onProfissionalAtualizado } = props
    const { httpGet, httpPost, httpPatch, httpDelete } = useAPI()

    const [acaoCarregando, setAcaoCarregando] = useState(false)
    const [erro, setErro] = useState('')

    const [diasSemanais, setDiasSemanais] = useState<DiaSemanalForm[]>(
        DIAS_SEMANA.map(() => diaSemanalPadrao())
    )
    const [salvandoSemanais, setSalvandoSemanais] = useState(false)
    const [erroSemanais, setErroSemanais] = useState('')

    const [excecoes, setExcecoes] = useState<ExcecaoAgendaApi[]>([])
    const [novaExcecaoData, setNovaExcecaoData] = useState('')
    const [novaExcecaoFechado, setNovaExcecaoFechado] = useState(true)
    const [novaExcecaoHoraInicio, setNovaExcecaoHoraInicio] = useState('08:00')
    const [novaExcecaoHoraFim, setNovaExcecaoHoraFim] = useState('19:00')
    const [salvandoExcecao, setSalvandoExcecao] = useState(false)
    const [erroExcecao, setErroExcecao] = useState('')

    const [profissionalAgendaId, setProfissionalAgendaId] = useState<string>('')
    const [diasTrabalho, setDiasTrabalho] = useState<number[]>([1, 2, 3, 4, 5, 6])
    const [horaInicio, setHoraInicio] = useState('08:00')
    const [horaFim, setHoraFim] = useState('19:00')
    const [tempoSlotMinutos, setTempoSlotMinutos] = useState('15')
    const [temAlmoco, setTemAlmoco] = useState(false)
    const [horaAlmocoInicio, setHoraAlmocoInicio] = useState('12:00')
    const [horaAlmocoFim, setHoraAlmocoFim] = useState('13:00')

    const profissionaisPermitidosAgenda = useMemo(() => {
        if (usuario?.role === 'BARBEIRO') {
            return profissionaisAdmin.filter((p) => p.id === usuario.profissionalId)
        }
        return profissionaisAdmin
    }, [profissionaisAdmin, usuario?.profissionalId, usuario?.role])

    const profissionalAgendaSelecionado = useMemo(() => {
        return profissionaisAdmin.find((p) => String(p.id) === profissionalAgendaId) ?? null
    }, [profissionaisAdmin, profissionalAgendaId])

    const regexHora = /^([01]\d|2[0-3]):([0-5]\d)$/
    const erroProfissionalAgenda = !profissionalAgendaId
    const erroDiasTrabalho = diasTrabalho.length === 0
    const erroHoraInicio = !regexHora.test(horaInicio)
    const erroHoraFimFormato = !regexHora.test(horaFim)

    const minutosInicio = !erroHoraInicio ? Number(horaInicio.slice(0, 2)) * 60 + Number(horaInicio.slice(3, 5)) : 0
    const minutosFim = !erroHoraFimFormato ? Number(horaFim.slice(0, 2)) * 60 + Number(horaFim.slice(3, 5)) : 0
    const erroJanelaHora = !erroHoraInicio && !erroHoraFimFormato && minutosFim <= minutosInicio

    const slot = Number(tempoSlotMinutos)
    const erroTempoSlot = !Number.isInteger(slot) || slot < 5 || slot > 120

    const erroHoraAlmocoInicio = temAlmoco && !regexHora.test(horaAlmocoInicio)
    const erroHoraAlmocoFim = temAlmoco && !regexHora.test(horaAlmocoFim)

    const minutosAlmocoInicio =
        temAlmoco && !erroHoraAlmocoInicio
            ? Number(horaAlmocoInicio.slice(0, 2)) * 60 + Number(horaAlmocoInicio.slice(3, 5))
            : 0
    const minutosAlmocoFim =
        temAlmoco && !erroHoraAlmocoFim
            ? Number(horaAlmocoFim.slice(0, 2)) * 60 + Number(horaAlmocoFim.slice(3, 5))
            : 0

    const erroJanelaAlmoco =
        temAlmoco && !erroHoraAlmocoInicio && !erroHoraAlmocoFim && minutosAlmocoFim <= minutosAlmocoInicio

    const erroAlmocoForaDaJanela =
        temAlmoco &&
        !erroHoraAlmocoInicio &&
        !erroHoraAlmocoFim &&
        !erroJanelaAlmoco &&
        !erroHoraInicio &&
        !erroHoraFimFormato &&
        (minutosAlmocoInicio < minutosInicio || minutosAlmocoFim > minutosFim)

    const erroAgendaFormulario = useMemo(() => {
        if (erroProfissionalAgenda) return 'Selecione um barbeiro para editar a agenda.'

        if (erroDiasTrabalho) {
            return 'Selecione ao menos um dia de trabalho.'
        }

        if (erroHoraInicio || erroHoraFimFormato) {
            return 'Informe horarios validos no formato HH:mm.'
        }

        if (erroJanelaHora) {
            return 'A hora fim deve ser maior que a hora inicio.'
        }

        if (erroTempoSlot) {
            return 'Tempo por slot deve ser um numero inteiro entre 5 e 120.'
        }

        if (erroHoraAlmocoInicio || erroHoraAlmocoFim) {
            return 'Informe um horario de almoco valido no formato HH:mm.'
        }

        if (erroJanelaAlmoco) {
            return 'O fim do almoco deve ser maior que o inicio.'
        }

        if (erroAlmocoForaDaJanela) {
            return 'O horario de almoco deve estar dentro da janela de atendimento.'
        }

        return ''
    }, [
        erroDiasTrabalho,
        erroHoraFimFormato,
        erroHoraInicio,
        erroJanelaHora,
        erroProfissionalAgenda,
        erroTempoSlot,
        erroHoraAlmocoInicio,
        erroHoraAlmocoFim,
        erroJanelaAlmoco,
        erroAlmocoForaDaJanela,
    ])

    useEffect(() => {
        // So pre-seleciona automaticamente quando ha uma unica opcao possivel
        // (barbeiro editando a propria agenda). Pra DONO/FUNCIONARIO, que
        // podem editar qualquer barbeiro, deixamos sem selecao ate a pessoa
        // escolher explicitamente -- selecionar o primeiro da lista por
        // padrao ja causou edicao acidental na agenda do barbeiro errado.
        if (usuario?.role !== 'BARBEIRO') return
        if (profissionalAgendaId) return

        const idPadrao = String(usuario.profissionalId ?? '')
        if (idPadrao) {
            setProfissionalAgendaId(idPadrao)
        }
    }, [usuario?.profissionalId, usuario?.role, profissionalAgendaId])

    useEffect(() => {
        if (!profissionalAgendaSelecionado) return

        setDiasTrabalho(profissionalAgendaSelecionado.diasTrabalho ?? [1, 2, 3, 4, 5, 6])
        setHoraInicio(profissionalAgendaSelecionado.horaInicio ?? '08:00')
        setHoraFim(profissionalAgendaSelecionado.horaFim ?? '19:00')
        setTempoSlotMinutos(String(profissionalAgendaSelecionado.tempoSlotMinutos ?? 15))
        const possuiAlmoco = !!(
            profissionalAgendaSelecionado.horaAlmocoInicio && profissionalAgendaSelecionado.horaAlmocoFim
        )
        setTemAlmoco(possuiAlmoco)
        setHoraAlmocoInicio(profissionalAgendaSelecionado.horaAlmocoInicio ?? '12:00')
        setHoraAlmocoFim(profissionalAgendaSelecionado.horaAlmocoFim ?? '13:00')
    }, [profissionalAgendaSelecionado])

    const carregarHorariosPorDia = useCallback(async () => {
        if (!profissionalAgendaId) {
            setDiasSemanais(DIAS_SEMANA.map(() => diaSemanalPadrao()))
            setExcecoes([])
            return
        }

        try {
            const [semanais, excecoesApi] = await Promise.all([
                httpGet(`profissional/${profissionalAgendaId}/horarios-semanais`) as Promise<HorarioSemanalApi[]>,
                httpGet(`profissional/${profissionalAgendaId}/excecoes`) as Promise<ExcecaoAgendaApi[]>,
            ])

            setDiasSemanais(
                DIAS_SEMANA.map((dia) => {
                    const existente = semanais.find((s) => s.diaSemana === dia.valor)
                    if (!existente) return diaSemanalPadrao()
                    return {
                        ativo: true,
                        horaInicio: existente.horaInicio,
                        horaFim: existente.horaFim,
                        tempoSlotMinutos:
                            existente.tempoSlotMinutos !== null ? String(existente.tempoSlotMinutos) : '',
                        temAlmoco: !!(existente.horaAlmocoInicio && existente.horaAlmocoFim),
                        horaAlmocoInicio: existente.horaAlmocoInicio ?? '12:00',
                        horaAlmocoFim: existente.horaAlmocoFim ?? '13:00',
                    }
                })
            )
            setExcecoes(excecoesApi)
        } catch (e) {
            // Mantem o estado atual (formulario vazio) se a listagem falhar.
        }
    }, [profissionalAgendaId, httpGet])

    useEffect(() => {
        carregarHorariosPorDia()
    }, [carregarHorariosPorDia])

    function alterarDiaSemanal(indice: number, alteracoes: Partial<DiaSemanalForm>) {
        setDiasSemanais((atual) =>
            atual.map((dia, i) => (i === indice ? { ...dia, ...alteracoes } : dia))
        )
    }

    async function salvarHorariosSemanais() {
        setErroSemanais('')

        const ativos = diasSemanais
            .map((dia, indice) => ({ dia, diaSemana: DIAS_SEMANA[indice].valor }))
            .filter((item) => item.dia.ativo)

        for (const { dia, diaSemana } of ativos) {
            const erroJanela = validarJanela(
                dia.horaInicio,
                dia.horaFim,
                dia.temAlmoco,
                dia.horaAlmocoInicio,
                dia.horaAlmocoFim
            )
            if (erroJanela) {
                setErroSemanais(`${DIAS_SEMANA.find((d) => d.valor === diaSemana)?.label}: ${erroJanela}`)
                return
            }
            if (dia.tempoSlotMinutos.trim()) {
                const slot = Number(dia.tempoSlotMinutos)
                if (!Number.isInteger(slot) || slot < 5 || slot > 120) {
                    setErroSemanais('Tempo por slot deve ser um numero inteiro entre 5 e 120.')
                    return
                }
            }
        }

        try {
            setSalvandoSemanais(true)
            await httpPost(
                `profissional/${profissionalAgendaId}/horarios-semanais`,
                ativos.map(({ dia, diaSemana }) => ({
                    diaSemana,
                    horaInicio: dia.horaInicio,
                    horaFim: dia.horaFim,
                    horaAlmocoInicio: dia.temAlmoco ? dia.horaAlmocoInicio : null,
                    horaAlmocoFim: dia.temAlmoco ? dia.horaAlmocoFim : null,
                    tempoSlotMinutos: dia.tempoSlotMinutos.trim() ? Number(dia.tempoSlotMinutos) : null,
                }))
            )
            window.alert('Horarios por dia da semana atualizados com sucesso.')
        } catch (e: any) {
            const mensagem = e?.message ?? 'Nao foi possivel salvar os horarios por dia.'
            setErroSemanais(mensagem)
            window.alert(mensagem)
        } finally {
            setSalvandoSemanais(false)
        }
    }

    async function adicionarExcecao() {
        setErroExcecao('')

        if (!novaExcecaoData) {
            setErroExcecao('Selecione uma data.')
            return
        }
        if (!novaExcecaoFechado) {
            const erroJanela = validarJanela(novaExcecaoHoraInicio, novaExcecaoHoraFim, false, '', '')
            if (erroJanela) {
                setErroExcecao(erroJanela)
                return
            }
        }

        try {
            setSalvandoExcecao(true)
            await httpPost(`profissional/${profissionalAgendaId}/excecoes`, {
                data: novaExcecaoData,
                fechado: novaExcecaoFechado,
                horaInicio: novaExcecaoFechado ? null : novaExcecaoHoraInicio,
                horaFim: novaExcecaoFechado ? null : novaExcecaoHoraFim,
            })
            setNovaExcecaoData('')
            await carregarHorariosPorDia()
        } catch (e: any) {
            setErroExcecao(e?.message ?? 'Nao foi possivel salvar a excecao.')
        } finally {
            setSalvandoExcecao(false)
        }
    }

    async function removerExcecao(data: string) {
        try {
            await httpDelete(`profissional/${profissionalAgendaId}/excecoes/${data.slice(0, 10)}`)
            setExcecoes((atual) => atual.filter((e) => e.data.slice(0, 10) !== data.slice(0, 10)))
        } catch (e: any) {
            window.alert(e?.message ?? 'Nao foi possivel remover a excecao.')
        }
    }

    function alternarDia(dia: number) {
        setDiasTrabalho((atual) =>
            atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia].sort((a, b) => a - b)
        )
    }

    async function salvarAgendaProfissional() {
        try {
            setErro('')
            setAcaoCarregando(true)
            if (erroAgendaFormulario) {
                setErro(erroAgendaFormulario)
                return
            }

            const atualizado = await httpPatch(`profissional/${profissionalAgendaId}/agenda`, {
                diasTrabalho,
                horaInicio,
                horaFim,
                horaAlmocoInicio: temAlmoco ? horaAlmocoInicio : null,
                horaAlmocoFim: temAlmoco ? horaAlmocoFim : null,
                tempoSlotMinutos: Number(tempoSlotMinutos),
            })

            onProfissionalAtualizado(atualizado)
            window.alert(`Agenda de ${atualizado.nome} atualizada com sucesso.`)
        } catch (e: any) {
            const mensagem = e?.message ?? 'Nao foi possivel atualizar a agenda do barbeiro.'
            setErro(mensagem)
            window.alert(mensagem)
        } finally {
            setAcaoCarregando(false)
        }
    }

    return (
        <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
            <h2 className="text-xl font-bold text-zinc-100">Agenda por barbeiro</h2>

            {erro ? (
                <div className="bg-red-900/40 border border-red-700 text-red-200 rounded px-4 py-3">
                    {erro}
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <select
                    value={profissionalAgendaId}
                    onChange={(e) => setProfissionalAgendaId(e.target.value)}
                    disabled={usuario?.role === 'BARBEIRO'}
                    className={`bg-zinc-900 border rounded px-3 py-2 disabled:opacity-70 ${erroProfissionalAgenda ? 'border-red-500' : 'border-zinc-700'}`}
                >
                    <option value="">Selecione o barbeiro</option>
                    {profissionaisPermitidosAgenda.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.nome}
                        </option>
                    ))}
                </select>

                <input
                    type="number"
                    min={5}
                    max={120}
                    value={tempoSlotMinutos}
                    onChange={(e) => setTempoSlotMinutos(e.target.value)}
                    className={`bg-zinc-900 border rounded px-3 py-2 ${erroTempoSlot ? 'border-red-500' : 'border-zinc-700'}`}
                    placeholder="Tempo por slot (min)"
                />

                <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className={`bg-zinc-900 border rounded px-3 py-2 ${erroHoraInicio || erroJanelaHora ? 'border-red-500' : 'border-zinc-700'}`}
                />
                <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className={`bg-zinc-900 border rounded px-3 py-2 ${erroHoraFimFormato || erroJanelaHora ? 'border-red-500' : 'border-zinc-700'}`}
                />
            </div>

            <div className="space-y-1 text-xs">
                {erroProfissionalAgenda ? <p className="text-red-400">Selecione um barbeiro.</p> : null}
                {erroTempoSlot ? <p className="text-red-400">Tempo por slot deve ser inteiro entre 5 e 120.</p> : null}
                {erroHoraInicio || erroHoraFimFormato ? (
                    <p className="text-red-400">Preencha hora inicio e fim em HH:mm.</p>
                ) : null}
                {erroJanelaHora ? <p className="text-red-400">Hora fim deve ser maior que hora inicio.</p> : null}
            </div>

            <div className={`flex flex-wrap gap-2 rounded ${erroDiasTrabalho ? 'p-2 border border-red-500' : ''}`}>
                {DIAS_SEMANA.map((dia) => (
                    <button
                        key={dia.valor}
                        onClick={() => alternarDia(dia.valor)}
                        className={`px-3 py-2 rounded border ${diasTrabalho.includes(dia.valor)
                            ? 'bg-green-600 text-white border-green-500'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            }`}
                    >
                        {dia.label}
                    </button>
                ))}
            </div>

            {erroDiasTrabalho ? (
                <p className="text-xs text-red-400">Selecione ao menos um dia de trabalho.</p>
            ) : null}

            <div className="space-y-3 border-t border-zinc-700 pt-4">
                <label className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                        type="checkbox"
                        checked={temAlmoco}
                        onChange={(e) => setTemAlmoco(e.target.checked)}
                    />
                    Definir horário de almoço
                </label>

                {temAlmoco ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <input
                            type="time"
                            value={horaAlmocoInicio}
                            onChange={(e) => setHoraAlmocoInicio(e.target.value)}
                            className={`bg-zinc-900 border rounded px-3 py-2 ${erroHoraAlmocoInicio || erroJanelaAlmoco || erroAlmocoForaDaJanela ? 'border-red-500' : 'border-zinc-700'}`}
                        />
                        <input
                            type="time"
                            value={horaAlmocoFim}
                            onChange={(e) => setHoraAlmocoFim(e.target.value)}
                            className={`bg-zinc-900 border rounded px-3 py-2 ${erroHoraAlmocoFim || erroJanelaAlmoco || erroAlmocoForaDaJanela ? 'border-red-500' : 'border-zinc-700'}`}
                        />
                    </div>
                ) : null}
            </div>

            {erroAgendaFormulario ? (
                <p className="text-sm text-amber-300">{erroAgendaFormulario}</p>
            ) : (
                <p className="text-sm text-green-300">Agenda pronta para salvar.</p>
            )}

            <button
                onClick={salvarAgendaProfissional}
                disabled={!!erroAgendaFormulario}
                className={`button ${erroAgendaFormulario ? 'bg-zinc-600 cursor-not-allowed' : 'bg-green-600'}`}
            >
                {acaoCarregando ? 'Salvando agenda...' : 'Salvar agenda do barbeiro'}
            </button>

            {profissionalAgendaId ? (
                <div className="border-t border-zinc-700 pt-4 space-y-3">
                    <h3 className="text-lg font-semibold text-zinc-100">Horários por dia da semana</h3>
                    <p className="text-xs text-zinc-400">
                        Sobrescreve o horário base só nos dias marcados abaixo. Um dia sem
                        customização usa o horário base definido acima.
                    </p>

                    <div className="space-y-2">
                        {DIAS_SEMANA.map((dia, indice) => {
                            const form = diasSemanais[indice]
                            return (
                                <div key={dia.valor} className="border border-zinc-700 rounded p-3 space-y-2">
                                    <label className="flex items-center gap-2 text-sm text-zinc-200">
                                        <input
                                            type="checkbox"
                                            checked={form.ativo}
                                            onChange={(e) => alterarDiaSemanal(indice, { ativo: e.target.checked })}
                                        />
                                        {dia.label}
                                    </label>

                                    {form.ativo ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 pl-6">
                                            <input
                                                type="time"
                                                value={form.horaInicio}
                                                onChange={(e) =>
                                                    alterarDiaSemanal(indice, { horaInicio: e.target.value })
                                                }
                                                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                            />
                                            <input
                                                type="time"
                                                value={form.horaFim}
                                                onChange={(e) => alterarDiaSemanal(indice, { horaFim: e.target.value })}
                                                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                            />
                                            <input
                                                type="number"
                                                min={5}
                                                max={120}
                                                value={form.tempoSlotMinutos}
                                                onChange={(e) =>
                                                    alterarDiaSemanal(indice, { tempoSlotMinutos: e.target.value })
                                                }
                                                placeholder="Slot (padrão)"
                                                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                            />

                                            <label className="flex items-center gap-2 text-xs text-zinc-300 lg:col-span-3">
                                                <input
                                                    type="checkbox"
                                                    checked={form.temAlmoco}
                                                    onChange={(e) =>
                                                        alterarDiaSemanal(indice, { temAlmoco: e.target.checked })
                                                    }
                                                />
                                                Almoço diferente neste dia
                                            </label>

                                            {form.temAlmoco ? (
                                                <>
                                                    <input
                                                        type="time"
                                                        value={form.horaAlmocoInicio}
                                                        onChange={(e) =>
                                                            alterarDiaSemanal(indice, {
                                                                horaAlmocoInicio: e.target.value,
                                                            })
                                                        }
                                                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                                    />
                                                    <input
                                                        type="time"
                                                        value={form.horaAlmocoFim}
                                                        onChange={(e) =>
                                                            alterarDiaSemanal(indice, {
                                                                horaAlmocoFim: e.target.value,
                                                            })
                                                        }
                                                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                                    />
                                                </>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            )
                        })}
                    </div>

                    {erroSemanais ? <p className="text-sm text-red-400">{erroSemanais}</p> : null}

                    <button
                        onClick={salvarHorariosSemanais}
                        disabled={salvandoSemanais}
                        className={`button ${salvandoSemanais ? 'bg-zinc-600 cursor-not-allowed' : 'bg-green-600'}`}
                    >
                        {salvandoSemanais ? 'Salvando...' : 'Salvar horários por dia'}
                    </button>
                </div>
            ) : null}

            {profissionalAgendaId ? (
                <div className="border-t border-zinc-700 pt-4 space-y-3">
                    <h3 className="text-lg font-semibold text-zinc-100">Exceções (feriados, imprevistos)</h3>
                    <p className="text-xs text-zinc-400">
                        Sobrescreve o horário (ou fecha a agenda) numa data específica, com
                        prioridade sobre o horário por dia da semana e o horário base.
                    </p>

                    <div className="space-y-2">
                        {excecoes.length === 0 ? (
                            <p className="text-sm text-zinc-500">Nenhuma exceção cadastrada.</p>
                        ) : (
                            excecoes.map((excecao) => (
                                <div
                                    key={excecao.id}
                                    className="flex items-center justify-between border border-zinc-700 rounded px-3 py-2"
                                >
                                    <span className="text-sm text-zinc-200">
                                        {excecao.data.slice(0, 10)} —{' '}
                                        {excecao.fechado
                                            ? 'fechado'
                                            : `${excecao.horaInicio} às ${excecao.horaFim}`}
                                    </span>
                                    <button
                                        onClick={() => removerExcecao(excecao.data)}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        remover
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 items-start">
                        <input
                            type="date"
                            value={novaExcecaoData}
                            onChange={(e) => setNovaExcecaoData(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                        />
                        <label className="flex items-center gap-2 text-sm text-zinc-200">
                            <input
                                type="checkbox"
                                checked={novaExcecaoFechado}
                                onChange={(e) => setNovaExcecaoFechado(e.target.checked)}
                            />
                            Fechar o dia inteiro
                        </label>
                        {!novaExcecaoFechado ? (
                            <>
                                <input
                                    type="time"
                                    value={novaExcecaoHoraInicio}
                                    onChange={(e) => setNovaExcecaoHoraInicio(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                />
                                <input
                                    type="time"
                                    value={novaExcecaoHoraFim}
                                    onChange={(e) => setNovaExcecaoHoraFim(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                />
                            </>
                        ) : null}
                    </div>

                    {erroExcecao ? <p className="text-sm text-red-400">{erroExcecao}</p> : null}

                    <button
                        onClick={adicionarExcecao}
                        disabled={salvandoExcecao}
                        className={`button ${salvandoExcecao ? 'bg-zinc-600 cursor-not-allowed' : 'bg-green-600'}`}
                    >
                        {salvandoExcecao ? 'Salvando...' : 'Adicionar exceção'}
                    </button>
                </div>
            ) : null}
        </section>
    )
}
