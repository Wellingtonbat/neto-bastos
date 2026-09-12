import { useCallback, useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { Agendamento, Profissional, RoleUsuario, Servico } from '@neto-bastos/core'
import useAPI from '../data/hooks/useAPI'
import useUsuario from '../data/hooks/useUsuario'
import { useFocusEffect } from '@react-navigation/native'
import NovoAgendamentoCliente from '../components/perfil/NovoAgendamentoCliente'

type StatusAgendamento = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO'
type Acao = 'ATUALIZAR_STATUS' | 'EXCLUIR_AGENDAMENTO' | null

const STATUS_OPCOES: Array<'TODOS' | StatusAgendamento> = [
    'TODOS',
    'PENDENTE',
    'CONFIRMADO',
    'CANCELADO',
]

function dataYYYYMMDD(data: Date) {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
}

function formatarDataHora(valor: Date | string) {
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return '--'
    return data.toLocaleString('pt-BR')
}

export default function MinhaAgenda() {
    const { httpGet, httpPatch, httpDelete } = useAPI()
    const { usuario } = useUsuario()

    const podeVerTodosBarbeiros = usuario?.role === 'FUNCIONARIO' || usuario?.role === 'DONO'
    const podeExcluir = usuario?.role === 'DONO' || usuario?.role === 'BARBEIRO'

    const [mostrandoNovoAgendamento, setMostrandoNovoAgendamento] = useState(false)
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
    const [profissionais, setProfissionais] = useState<Profissional[]>([])
    const [servicos, setServicos] = useState<Servico[]>([])

    const [filtroStatus, setFiltroStatus] = useState<'TODOS' | StatusAgendamento>('TODOS')
    const [filtroProfissional, setFiltroProfissional] = useState<string>('todos')
    const [filtroData, setFiltroData] = useState<string>(dataYYYYMMDD(new Date()))

    const [carregando, setCarregando] = useState(false)
    const [acao, setAcao] = useState<Acao>(null)
    const [erro, setErro] = useState('')

    const carregarProfissionais = useCallback(async () => {
        const data = await httpGet('profissional')
        setProfissionais(data ?? [])
    }, [httpGet])

    const carregarServicos = useCallback(async () => {
        const data = await httpGet('servico')
        setServicos(data ?? [])
    }, [httpGet])

    const carregarAgendamentos = useCallback(async () => {
        const params = new URLSearchParams()
        if (filtroStatus !== 'TODOS') params.set('status', filtroStatus)
        if (podeVerTodosBarbeiros && filtroProfissional !== 'todos') {
            params.set('profissionalId', filtroProfissional)
        }
        if (filtroData) params.set('data', filtroData)

        const query = params.toString()
        const data = await httpGet(`agendamentos${query ? `?${query}` : ''}`)
        setAgendamentos(data ?? [])
    }, [filtroProfissional, filtroStatus, filtroData, podeVerTodosBarbeiros, httpGet])

    useFocusEffect(
        useCallback(() => {
            let ativo = true

            async function carregar() {
                try {
                    setCarregando(true)
                    setErro('')
                    await Promise.all([
                        carregarProfissionais(),
                        carregarServicos(),
                        carregarAgendamentos(),
                    ])
                } catch (e: any) {
                    if (!ativo) return
                    setErro(e?.message ?? 'Nao foi possivel carregar a agenda.')
                } finally {
                    if (!ativo) return
                    setCarregando(false)
                }
            }

            carregar()

            return () => {
                ativo = false
            }
        }, [carregarProfissionais, carregarServicos, carregarAgendamentos])
    )

    async function atualizarStatusAgendamento(id: number, status: StatusAgendamento) {
        try {
            setErro('')
            setAcao('ATUALIZAR_STATUS')
            await httpPatch(`agendamentos/${id}/status`, { status })
            await carregarAgendamentos()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel atualizar o status.')
        } finally {
            setAcao(null)
        }
    }

    async function excluirAgendamento(id: number) {
        try {
            setErro('')
            setAcao('EXCLUIR_AGENDAMENTO')
            await httpDelete(`agendamentos/${id}`)
            await carregarAgendamentos()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel excluir o agendamento.')
        } finally {
            setAcao(null)
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollConteudo}>
                <Text style={styles.titulo}>Minha Agenda</Text>

                <Pressable
                    style={[styles.chip, mostrandoNovoAgendamento ? styles.chipAtivo : null, { alignSelf: 'flex-start' }]}
                    onPress={() => setMostrandoNovoAgendamento((v) => !v)}
                >
                    <Text style={styles.chipTexto}>
                        {mostrandoNovoAgendamento ? '✕ Fechar' : '+ Novo agendamento para cliente'}
                    </Text>
                </Pressable>

                {mostrandoNovoAgendamento ? (
                    <NovoAgendamentoCliente
                        profissionais={profissionais}
                        servicos={servicos}
                        aoAgendarComSucesso={() => {
                            setMostrandoNovoAgendamento(false)
                            carregarAgendamentos()
                        }}
                    />
                ) : null}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosRow}>
                    {[
                        { label: 'Hoje', valor: dataYYYYMMDD(new Date()) },
                        { label: 'Amanhã', valor: dataYYYYMMDD(new Date(Date.now() + 86400000)) },
                        { label: 'Todas as datas', valor: '' },
                    ].map((opcao) => {
                        const selecionado = filtroData === opcao.valor
                        return (
                            <Pressable
                                key={opcao.label}
                                style={[styles.chip, selecionado ? styles.chipAtivo : null]}
                                onPress={() => setFiltroData(opcao.valor)}
                            >
                                <Text style={styles.chipTexto}>{opcao.label}</Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosRow}>
                    {STATUS_OPCOES.map((status) => {
                        const selecionado = filtroStatus === status
                        return (
                            <Pressable
                                key={status}
                                style={[styles.chip, selecionado ? styles.chipAtivo : null]}
                                onPress={() => setFiltroStatus(status)}
                            >
                                <Text style={styles.chipTexto}>{status}</Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>

                {podeVerTodosBarbeiros ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosRow}>
                        <Pressable
                            style={[styles.chip, filtroProfissional === 'todos' ? styles.chipAtivo : null]}
                            onPress={() => setFiltroProfissional('todos')}
                        >
                            <Text style={styles.chipTexto}>Todos barbeiros</Text>
                        </Pressable>
                        {profissionais.map((profissional) => {
                            const selecionado = filtroProfissional === String(profissional.id)
                            return (
                                <Pressable
                                    key={profissional.id}
                                    style={[styles.chip, selecionado ? styles.chipAtivo : null]}
                                    onPress={() => setFiltroProfissional(String(profissional.id))}
                                >
                                    <Text style={styles.chipTexto}>{profissional.nome}</Text>
                                </Pressable>
                            )
                        })}
                    </ScrollView>
                ) : null}

                {erro ? <Text style={styles.erro}>{erro}</Text> : null}
                {carregando ? <ActivityIndicator color="#22c55e" style={{ marginTop: 10 }} /> : null}

                {!carregando && agendamentos.length === 0 ? (
                    <Text style={styles.info}>Nenhum agendamento encontrado.</Text>
                ) : (
                    agendamentos.map((agendamento: any) => (
                        <View key={agendamento.id} style={styles.card}>
                            <Text style={styles.cardTitulo}>{agendamento.profissional?.nome ?? 'Sem barbeiro'}</Text>
                            <Text style={styles.cardTexto}>Cliente: {agendamento.emailCliente}</Text>
                            <Text style={styles.cardTexto}>Data: {formatarDataHora(agendamento.data)}</Text>
                            <Text style={styles.cardTexto}>Status: {agendamento.status ?? 'PENDENTE'}</Text>
                            <Text style={styles.cardTexto}>
                                Servicos: {agendamento.servicos?.map((s: any) => s.nome).join(', ') || 'Nenhum'}
                            </Text>

                            <View style={styles.acoesRow}>
                                {(agendamento.status ?? 'PENDENTE') === 'PENDENTE' ? (
                                    <>
                                        <Pressable
                                            style={styles.botaoAcao}
                                            onPress={() => atualizarStatusAgendamento(agendamento.id, 'CONFIRMADO')}
                                            disabled={!!acao}
                                        >
                                            <Text style={styles.botaoAcaoTexto}>Confirmar</Text>
                                        </Pressable>
                                        <Pressable
                                            style={styles.botaoAcao}
                                            onPress={() => atualizarStatusAgendamento(agendamento.id, 'CANCELADO')}
                                            disabled={!!acao}
                                        >
                                            <Text style={styles.botaoAcaoTexto}>Cancelar</Text>
                                        </Pressable>
                                    </>
                                ) : null}
                                {podeExcluir ? (
                                    <Pressable
                                        style={styles.botaoAcaoDanger}
                                        onPress={() => excluirAgendamento(agendamento.id)}
                                        disabled={!!acao}
                                    >
                                        <Text style={styles.botaoAcaoTexto}>Excluir</Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollConteudo: {
        padding: 16,
        gap: 10,
    },
    titulo: {
        color: '#f4f4f5',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    filtrosRow: {
        marginTop: 4,
    },
    chip: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginRight: 8,
    },
    chipAtivo: {
        backgroundColor: '#22c55e',
        borderColor: '#22c55e',
    },
    chipTexto: {
        color: '#e4e4e7',
        fontSize: 12,
    },
    erro: {
        color: '#f87171',
        marginTop: 8,
    },
    info: {
        color: '#a1a1aa',
        marginTop: 12,
    },
    card: {
        backgroundColor: '#18181b',
        borderRadius: 10,
        padding: 14,
        marginTop: 10,
        gap: 2,
    },
    cardTitulo: {
        color: '#f4f4f5',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    cardTexto: {
        color: '#d4d4d8',
        fontSize: 13,
    },
    acoesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    botaoAcao: {
        backgroundColor: '#3f3f46',
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    botaoAcaoDanger: {
        backgroundColor: '#7f1d1d',
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    botaoAcaoTexto: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
})
