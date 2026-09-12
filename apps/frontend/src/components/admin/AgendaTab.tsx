'use client'

import { useEffect, useMemo, useState } from 'react'
import { Profissional, Usuario } from '@neto-bastos/core'
import useAPI from '@/data/hooks/useAPI'
import { DIAS_SEMANA } from './adminShared'

export interface AgendaTabProps {
    profissionaisAdmin: Profissional[]
    usuario: Usuario | null
    onProfissionalAtualizado: (atualizado: Profissional) => void
}

export default function AgendaTab(props: AgendaTabProps) {
    const { profissionaisAdmin, usuario, onProfissionalAtualizado } = props
    const { httpPatch } = useAPI()

    const [acaoCarregando, setAcaoCarregando] = useState(false)
    const [erro, setErro] = useState('')

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
        </section>
    )
}
