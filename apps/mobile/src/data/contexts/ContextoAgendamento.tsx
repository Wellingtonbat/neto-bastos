import { createContext, useCallback, useEffect, useState } from 'react'
import { Profissional, Servico } from '@neto-bastos/core'
import { DataUtils } from '@neto-bastos/core'
import useUsuario from '../hooks/useUsuario'
import useAPI from '../hooks/useAPI'

interface ContextoAgendamentoProps {
    profissional: Profissional | null
    servicos: Servico[]
    data: Date | null
    horariosOcupados: string[]
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
    agendar(): Promise<void>
}

export const ContextoAgendamento = createContext({} as ContextoAgendamentoProps)

export function ProvedorAgendamento({ children }: { children: React.ReactNode }) {
    const [profissional, setProfissional] = useState<Profissional | null>(null)
    const [servicos, setServicos] = useState<Servico[]>([])
    const [data, setData] = useState<Date | null>(null)

    const { usuario } = useUsuario()
    const [horariosOcupados, setHorariosOcupados] = useState<string[]>([])
    const [carregandoHorarios, setCarregandoHorarios] = useState(false)
    const [carregandoAgendamento, setCarregandoAgendamento] = useState(false)
    const [versaoAgendamentos, setVersaoAgendamentos] = useState(0)
    const { httpGet, httpPost } = useAPI()

    const solicitarAtualizacaoAgendamentos = useCallback(() => {
        setVersaoAgendamentos((v) => v + 1)
    }, [])

    function selecionarProfissional(profissional: Profissional) {
        setProfissional(profissional)
    }

    function selecionarServicos(servicos: Servico[]) {
        setServicos(servicos)
    }

    function duracaoTotal() {
        const duracao = servicos.reduce((acc, atual) => {
            return (acc += atual.qtdeSlots * 15)
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

    async function agendar() {
        if (!usuario?.email) {
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
                emailCliente: usuario.email,
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
        setProfissional(null)
        setServicos([])
    }

    const obterHorariosOcupados = useCallback(
        async function (data: Date, profissional: Profissional): Promise<string[]> {
            try {
                if (!data || !profissional) return []
                const ano = data.getFullYear()
                const mes = String(data.getMonth() + 1).padStart(2, '0')
                const dia = String(data.getDate()).padStart(2, '0')
                const dtString = `${ano}-${mes}-${dia}`
                const ocupacao = await httpGet(
                    `agendamentos/ocupacao/${profissional!.id}/${dtString}`
                )
                return ocupacao ?? []
            } catch (e) {
                return []
            }
        },
        [httpGet]
    )

    useEffect(() => {
        if (!data || !profissional) {
            setHorariosOcupados([])
            return
        }

        let ativo = true
        setCarregandoHorarios(true)

        obterHorariosOcupados(data, profissional)
            .then((horarios) => {
                if (!ativo) return
                setHorariosOcupados(horarios)
            })
            .finally(() => {
                if (!ativo) return
                setCarregandoHorarios(false)
            })

        return () => {
            ativo = false
        }
    }, [data, profissional, obterHorariosOcupados])

    return (
        <ContextoAgendamento.Provider
            value={{
                data,
                profissional,
                servicos,
                horariosOcupados,
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
            }}
        >
            {children}
        </ContextoAgendamento.Provider>
    )
}
