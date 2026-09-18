import { createContext, useCallback, useEffect, useState } from 'react'
import { Profissional, Servico } from '@neto-bastos/core'
import { DataUtils } from '@neto-bastos/core'
import useUsuario from '../hooks/useUsuario'
import useAPI from '../hooks/useAPI'

export interface HorarioResolvido {
    fechado: boolean
    horaInicio: string
    horaFim: string
    horaAlmocoInicio: string | null
    horaAlmocoFim: string | null
    tempoSlotMinutos: number
}

interface ContextoAgendamentoProps {
    profissional: Profissional | null
    servicos: Servico[]
    data: Date | null
    horariosOcupados: string[]
    horarioDoDia: HorarioResolvido | null
    carregandoHorarios: boolean
    carregandoAgendamento: boolean
    versaoAgendamentos: number
    duracaoTotal(): string
    precoTotal(): number
    quantidadeDeSlots(): number
    selecionarProfissional(profissional: Profissional): void
    selecionarServicos(servicos: Servico[]): void
    selecionarData(data: Date | null): void
    solicitarAtualizacaoAgendamentos(): void
    agendar(emailClienteOverride?: string): Promise<void>
    limpar(): void
}

export const ContextoAgendamento = createContext({} as ContextoAgendamentoProps)

export function ProvedorAgendamento({ children }: { children: React.ReactNode }) {
    const [profissional, setProfissional] = useState<Profissional | null>(null)
    const [servicos, setServicos] = useState<Servico[]>([])
    const [data, setData] = useState<Date | null>(null)

    const { usuario } = useUsuario()
    const [horariosOcupados, setHorariosOcupados] = useState<string[]>([])
    const [horarioDoDia, setHorarioDoDia] = useState<HorarioResolvido | null>(null)
    const [carregandoHorarios, setCarregandoHorarios] = useState(false)
    const [carregandoAgendamento, setCarregandoAgendamento] = useState(false)
    const [versaoAgendamentos, setVersaoAgendamentos] = useState(0)
    const { httpGet, httpPost } = useAPI()

    const solicitarAtualizacaoAgendamentos = useCallback(() => {
        setVersaoAgendamentos((v) => v + 1)
    }, [])

    const selecionarProfissional = useCallback((profissional: Profissional) => {
        setProfissional(profissional)
    }, [])

    const selecionarServicos = useCallback((servicos: Servico[]) => {
        setServicos(servicos)
    }, [])

    function duracaoTotal() {
        const minutosPorSlot = profissional?.tempoSlotMinutos ?? 15
        const duracao = servicos.reduce((acc, atual) => {
            return (acc += atual.qtdeSlots * minutosPorSlot)
        }, 0)

        return `${Math.trunc(duracao / 60)}h ${duracao % 60}m`
    }

    function precoTotal() {
        return servicos.reduce((acc, atual) => {
            return (acc += atual.preco)
        }, 0)
    }

    const selecionarData = useCallback(function (hora: Date | null) {
        setData(hora)
    }, [])

    function quantidadeDeSlots() {
        const totalDeSlots = servicos.reduce((acc, servico) => {
            return (acc += servico.qtdeSlots)
        }, 0)

        return totalDeSlots
    }

    async function agendar(emailClienteOverride?: string) {
        const emailCliente = emailClienteOverride ?? usuario?.email
        if (!emailCliente) {
            throw new Error('Usuario nao autenticado.')
        }

        if (!profissional) {
            throw new Error('Selecione um barbeiro para continuar.')
        }

        if (servicos.length === 0) {
            throw new Error('Selecione ao menos um servico.')
        }

        if (!data) {
            throw new Error('Selecione dia e horario para o agendamento.')
        }

        try {
            setCarregandoAgendamento(true)
            await httpPost('agendamentos', {
                emailCliente,
                data,
                profissional,
                servicos,
            })
            solicitarAtualizacaoAgendamentos()
            limpar()
        } finally {
            setCarregandoAgendamento(false)
        }
    }

    function limpar() {
        setData(null)
        setHorariosOcupados([])
        setHorarioDoDia(null)
        setProfissional(null)
        setServicos([])
    }

    function dataParaISO(data: Date) {
        const ano = data.getFullYear()
        const mes = String(data.getMonth() + 1).padStart(2, '0')
        const dia = String(data.getDate()).padStart(2, '0')
        return `${ano}-${mes}-${dia}`
    }

    const obterHorariosOcupados = useCallback(
        async function (data: Date, profissional: Profissional): Promise<string[]> {
            try {
                if (!data || !profissional) return []
                const ocupacao = await httpGet(
                    `agendamentos/ocupacao/${profissional!.id}/${dataParaISO(data)}`
                )
                return ocupacao ?? []
            } catch (e) {
                return []
            }
        },
        [httpGet]
    )

    const obterHorarioDoDia = useCallback(
        async function (data: Date, profissional: Profissional): Promise<HorarioResolvido | null> {
            try {
                if (!data || !profissional) return null
                const resolvido = await httpGet(
                    `profissional/${profissional!.id}/horario-do-dia?data=${dataParaISO(data)}`
                )
                return resolvido ?? null
            } catch (e) {
                return null
            }
        },
        [httpGet]
    )

    useEffect(() => {
        if (!data || !profissional) {
            setHorariosOcupados([])
            setHorarioDoDia(null)
            return
        }

        let ativo = true
        setCarregandoHorarios(true)

        Promise.all([
            obterHorariosOcupados(data, profissional),
            obterHorarioDoDia(data, profissional),
        ])
            .then(([horarios, resolvido]) => {
                if (!ativo) return
                setHorariosOcupados(horarios)
                setHorarioDoDia(resolvido)
            })
            .finally(() => {
                if (!ativo) return
                setCarregandoHorarios(false)
            })

        return () => {
            ativo = false
        }
    }, [data, profissional, obterHorariosOcupados, obterHorarioDoDia, versaoAgendamentos])

    return (
        <ContextoAgendamento.Provider
            value={{
                data,
                profissional,
                servicos,
                horariosOcupados,
                horarioDoDia,
                carregandoHorarios,
                carregandoAgendamento,
                versaoAgendamentos,
                duracaoTotal,
                precoTotal,
                selecionarData,
                selecionarProfissional,
                quantidadeDeSlots,
                selecionarServicos,
                solicitarAtualizacaoAgendamentos,
                agendar,
                limpar,
            }}
        >
            {children}
        </ContextoAgendamento.Provider>
    )
}
