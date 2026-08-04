import { Agendamento, Profissional, RoleUsuario, Servico } from '@neto-bastos/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import useAPI from '@/src/data/hooks/useAPI'
import GerenciarBarbeiros from './GerenciarBarbeiros'
import useAgendamento from '@/src/data/hooks/useAgendamento'
import { useFocusEffect } from '@react-navigation/native'

type AbaAdmin = 'AGENDAMENTOS' | 'SERVICOS' | 'BARBEIROS' | 'AGENDA'
type StatusAgendamento = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO'
type Acao =
    | 'CARREGANDO'
    | 'ATUALIZAR_STATUS'
    | 'EXCLUIR_AGENDAMENTO'
    | 'CRIAR_SERVICO'
    | 'SALVAR_SERVICO'
    | 'EXCLUIR_SERVICO'
    | 'SALVAR_AGENDA'
    | null

const STATUS_OPCOES: Array<'TODOS' | StatusAgendamento> = [
    'TODOS',
    'PENDENTE',
    'CONFIRMADO',
    'CANCELADO',
]

const DIAS_SEMANA = [
    { valor: 0, label: 'Dom' },
    { valor: 1, label: 'Seg' },
    { valor: 2, label: 'Ter' },
    { valor: 3, label: 'Qua' },
    { valor: 4, label: 'Qui' },
    { valor: 5, label: 'Sex' },
    { valor: 6, label: 'Sab' },
]

interface PainelAdminProps {
    role?: RoleUsuario
    profissionalId?: number | null
    refreshToken?: number
    onRefreshComplete?: () => void
}

function formatarDataHora(valor: Date | string) {
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return '--'
    return data.toLocaleString('pt-BR')
}

export default function PainelAdmin(props: PainelAdminProps) {
    const { httpGet, httpPost, httpPatch, httpDelete } = useAPI()
    const { solicitarAtualizacaoAgendamentos } = useAgendamento()
    const [abaAtiva, setAbaAtiva] = useState<AbaAdmin>('AGENDAMENTOS')

    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
    const [servicos, setServicos] = useState<Servico[]>([])
    const [profissionais, setProfissionais] = useState<Profissional[]>([])

    const [filtroStatus, setFiltroStatus] = useState<'TODOS' | StatusAgendamento>('TODOS')
    const [filtroProfissional, setFiltroProfissional] = useState<string>('todos')

    const [carregando, setCarregando] = useState(false)
    const [acao, setAcao] = useState<Acao>(null)
    const [erro, setErro] = useState('')

    const [novoNomeServico, setNovoNomeServico] = useState('')
    const [novaDescricaoServico, setNovaDescricaoServico] = useState('')
    const [novoPrecoServico, setNovoPrecoServico] = useState('')
    const [novoSlotsServico, setNovoSlotsServico] = useState('1')
    const [novaImagemServico, setNovaImagemServico] = useState('/servicos/corte-de-cabelo.jpg')
    const [servicoEditandoId, setServicoEditandoId] = useState<number | null>(null)

    const [profissionalAgendaId, setProfissionalAgendaId] = useState<string>('')
    const [diasTrabalho, setDiasTrabalho] = useState<number[]>([1, 2, 3, 4, 5, 6])
    const [horaInicio, setHoraInicio] = useState('08:00')
    const [horaFim, setHoraFim] = useState('19:00')
    const [tempoSlotMinutos, setTempoSlotMinutos] = useState('15')

    const isDono = props.role === 'DONO'

    const abasDisponiveis = useMemo(() => {
        const base: AbaAdmin[] = ['AGENDAMENTOS', 'SERVICOS', 'AGENDA']
        if (isDono) base.push('BARBEIROS')
        return base
    }, [isDono])

    const profissionalAgendaSelecionado = useMemo(() => {
        return profissionais.find((p) => String(p.id) === profissionalAgendaId) ?? null
    }, [profissionais, profissionalAgendaId])

    const minutosPorSlotDisponiveis = useMemo(() => {
        const valores = profissionais.map((p) => p.tempoSlotMinutos ?? 15)
        return [...new Set(valores)].sort((a, b) => a - b)
    }, [profissionais])

    const estimativaDuracaoServico = useMemo(() => {
        const slots = Number(novoSlotsServico)
        if (!Number.isInteger(slots) || slots <= 0 || minutosPorSlotDisponiveis.length === 0) {
            return ''
        }
        const duracoes = minutosPorSlotDisponiveis.map((min) => `${slots * min} min`)
        return `${slots} slot(s) ≈ ${duracoes.join(' / ')} (conforme o profissional)`
    }, [novoSlotsServico, minutosPorSlotDisponiveis])

    const carregarProfissionais = useCallback(async () => {
        const data = await httpGet('profissional')
        setProfissionais(data ?? [])
    }, [httpGet])

    const carregarAgendamentos = useCallback(async () => {
        const params = new URLSearchParams()
        if (filtroStatus !== 'TODOS') params.set('status', filtroStatus)
        if (filtroProfissional !== 'todos') params.set('profissionalId', filtroProfissional)

        const query = params.toString()
        const data = await httpGet(`agendamentos${query ? `?${query}` : ''}`)
        setAgendamentos(data ?? [])
    }, [filtroProfissional, filtroStatus, httpGet])

    const carregarServicos = useCallback(async () => {
        const data = await httpGet('servico')
        setServicos(data ?? [])
    }, [httpGet])

    const carregarTudo = useCallback(async () => {
        try {
            setCarregando(true)
            setAcao('CARREGANDO')
            setErro('')
            await Promise.all([carregarAgendamentos(), carregarProfissionais(), carregarServicos()])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel carregar o painel admin.')
        } finally {
            setCarregando(false)
            setAcao(null)
        }
    }, [carregarAgendamentos, carregarProfissionais, carregarServicos])

    useEffect(() => {
        carregarTudo()
    }, [carregarTudo])

    useEffect(() => {
        if (props.refreshToken === undefined) return

        carregarTudo().finally(() => {
            props.onRefreshComplete?.()
        })
    }, [props.refreshToken])

    useFocusEffect(
        useCallback(() => {
            carregarTudo()
        }, [carregarTudo])
    )

    useEffect(() => {
        if (profissionais.length === 0) return

        const idPadrao =
            props.role === 'BARBEIRO'
                ? String(props.profissionalId ?? '')
                : String(profissionais[0]?.id ?? '')

        if (!profissionalAgendaId && idPadrao) {
            setProfissionalAgendaId(idPadrao)
        }
    }, [profissionais, profissionalAgendaId, props.profissionalId, props.role])

    useEffect(() => {
        if (!profissionalAgendaSelecionado) return
        setDiasTrabalho(profissionalAgendaSelecionado.diasTrabalho ?? [1, 2, 3, 4, 5, 6])
        setHoraInicio(profissionalAgendaSelecionado.horaInicio ?? '08:00')
        setHoraFim(profissionalAgendaSelecionado.horaFim ?? '19:00')
        setTempoSlotMinutos(String(profissionalAgendaSelecionado.tempoSlotMinutos ?? 15))
    }, [profissionalAgendaSelecionado])

    async function atualizarStatusAgendamento(id: number, status: StatusAgendamento) {
        try {
            setAcao('ATUALIZAR_STATUS')
            await httpPatch(`agendamentos/${id}/status`, { status })
            await carregarAgendamentos()
            solicitarAtualizacaoAgendamentos()
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel atualizar o status.')
        } finally {
            setAcao(null)
        }
    }

    async function excluirAgendamento(id: number) {
        try {
            setAcao('EXCLUIR_AGENDAMENTO')
            await httpDelete(`agendamentos/${id}`)
            await carregarAgendamentos()
            solicitarAtualizacaoAgendamentos()
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel excluir o agendamento.')
        } finally {
            setAcao(null)
        }
    }

    function iniciarEdicaoServico(servico: Servico) {
        setServicoEditandoId(servico.id)
        setNovoNomeServico(servico.nome)
        setNovaDescricaoServico(servico.descricao)
        setNovoPrecoServico(String(servico.preco))
        setNovoSlotsServico(String(servico.qtdeSlots))
        setNovaImagemServico(servico.imagemURL)
    }

    function limparFormularioServico() {
        setServicoEditandoId(null)
        setNovoNomeServico('')
        setNovaDescricaoServico('')
        setNovoPrecoServico('')
        setNovoSlotsServico('1')
        setNovaImagemServico('/servicos/corte-de-cabelo.jpg')
    }

    async function salvarServico() {
        try {
            const preco = Number(String(novoPrecoServico).replace(',', '.'))
            const qtdeSlots = Number(novoSlotsServico)

            if (!novoNomeServico.trim() || !novaDescricaoServico.trim() || !novaImagemServico.trim()) {
                Alert.alert('Campos obrigatorios', 'Preencha nome, descricao e imagem.')
                return
            }

            if (!Number.isFinite(preco) || preco <= 0) {
                Alert.alert('Preco invalido', 'Informe um preco valido para o servico.')
                return
            }

            if (!Number.isInteger(qtdeSlots) || qtdeSlots <= 0) {
                Alert.alert('Slots invalidos', 'Informe uma quantidade de slots valida.')
                return
            }

            const payload = {
                nome: novoNomeServico.trim(),
                descricao: novaDescricaoServico.trim(),
                preco,
                qtdeSlots,
                imagemURL: novaImagemServico.trim(),
            }

            if (servicoEditandoId) {
                setAcao('SALVAR_SERVICO')
                await httpPatch(`servico/${servicoEditandoId}`, payload)
            } else {
                setAcao('CRIAR_SERVICO')
                await httpPost('servico', payload)
            }

            limparFormularioServico()

            await carregarServicos()
            Alert.alert('Sucesso', servicoEditandoId ? 'Servico atualizado com sucesso.' : 'Servico cadastrado com sucesso.')
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel salvar o servico.')
        } finally {
            setAcao(null)
        }
    }

    async function excluirServico(id: number) {
        try {
            setAcao('EXCLUIR_SERVICO')
            await httpDelete(`servico/${id}`)
            await carregarServicos()
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel excluir o servico.')
        } finally {
            setAcao(null)
        }
    }

    function alternarDiaTrabalho(dia: number) {
        setDiasTrabalho((atual) => {
            if (atual.includes(dia)) {
                return atual.filter((d) => d !== dia)
            }
            return [...atual, dia].sort((a, b) => a - b)
        })
    }

    async function salvarAgenda() {
        try {
            const profissionalId = Number(profissionalAgendaId)
            const slot = Number(tempoSlotMinutos)

            if (!Number.isInteger(profissionalId) || profissionalId <= 0) {
                Alert.alert('Selecione o barbeiro', 'Escolha um profissional para editar a agenda.')
                return
            }

            if (diasTrabalho.length === 0) {
                Alert.alert('Dias obrigatorios', 'Selecione ao menos um dia de trabalho.')
                return
            }

            setAcao('SALVAR_AGENDA')
            await httpPatch(`profissional/${profissionalId}/agenda`, {
                diasTrabalho,
                horaInicio,
                horaFim,
                tempoSlotMinutos: slot,
            })

            await carregarProfissionais()
            Alert.alert('Sucesso', 'Agenda atualizada com sucesso.')
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel salvar a agenda.')
        } finally {
            setAcao(null)
        }
    }

    function renderizarAba(aba: AbaAdmin, label: string) {
        const ativa = abaAtiva === aba
        return (
            <Pressable
                key={aba}
                onPress={() => setAbaAtiva(aba)}
                style={[styles.tab, ativa ? styles.tabAtiva : null]}
            >
                <Text style={[styles.tabTexto, ativa ? styles.tabTextoAtivo : null]}>{label}</Text>
            </Pressable>
        )
    }

    function renderizarAgendamentos() {
        return (
            <View style={styles.secao}>
                <Text style={styles.tituloSecao}>Gerenciar Agendamentos</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosRow}>
                    {STATUS_OPCOES.map((status) => {
                        const selecionado = filtroStatus === status
                        return (
                            <Pressable
                                key={status}
                                style={[styles.filtroChip, selecionado ? styles.filtroChipAtivo : null]}
                                onPress={() => setFiltroStatus(status)}
                            >
                                <Text style={styles.filtroChipTexto}>{status}</Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosRow}>
                    <Pressable
                        style={[styles.filtroChip, filtroProfissional === 'todos' ? styles.filtroChipAtivo : null]}
                        onPress={() => setFiltroProfissional('todos')}
                    >
                        <Text style={styles.filtroChipTexto}>Todos barbeiros</Text>
                    </Pressable>

                    {profissionais.map((profissional) => {
                        const selecionado = filtroProfissional === String(profissional.id)
                        return (
                            <Pressable
                                key={profissional.id}
                                style={[styles.filtroChip, selecionado ? styles.filtroChipAtivo : null]}
                                onPress={() => setFiltroProfissional(String(profissional.id))}
                            >
                                <Text style={styles.filtroChipTexto}>{profissional.nome}</Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>

                {agendamentos.map((agendamento) => (
                    <View key={agendamento.id} style={styles.card}>
                        <Text style={styles.cardTitulo}>{agendamento.profissional?.nome ?? 'Sem barbeiro'}</Text>
                        <Text style={styles.cardTexto}>Cliente: {agendamento.emailCliente}</Text>
                        <Text style={styles.cardTexto}>Data: {formatarDataHora(agendamento.data as any)}</Text>
                        <Text style={styles.cardTexto}>Status: {agendamento.status ?? 'PENDENTE'}</Text>
                        <Text style={styles.cardTexto}>
                            Servicos: {agendamento.servicos?.map((s) => s.nome).join(', ') || 'Nenhum'}
                        </Text>

                        <View style={styles.acoesRow}>
                            {agendamento.status !== 'CONFIRMADO' ? (
                                <Pressable
                                    style={styles.botaoAcao}
                                    onPress={() => atualizarStatusAgendamento(agendamento.id, 'CONFIRMADO')}
                                >
                                    <Text style={styles.botaoAcaoTexto}>Confirmar</Text>
                                </Pressable>
                            ) : null}

                            <Pressable
                                style={styles.botaoAcao}
                                onPress={() => atualizarStatusAgendamento(agendamento.id, 'CANCELADO')}
                            >
                                <Text style={styles.botaoAcaoTexto}>Cancelar</Text>
                            </Pressable>

                            <Pressable style={styles.botaoAcaoDanger} onPress={() => excluirAgendamento(agendamento.id)}>
                                <Text style={styles.botaoAcaoTexto}>Excluir</Text>
                            </Pressable>
                        </View>
                    </View>
                ))}

                {agendamentos.length === 0 ? <Text style={styles.info}>Nenhum agendamento encontrado.</Text> : null}
            </View>
        )
    }

    function renderizarServicos() {
        return (
            <View style={styles.secao}>
                <Text style={styles.tituloSecao}>Gerenciar Servicos</Text>

                <View style={styles.formCard}>
                    <TextInput
                        placeholder="Nome"
                        placeholderTextColor="#71717a"
                        value={novoNomeServico}
                        onChangeText={setNovoNomeServico}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="Descricao"
                        placeholderTextColor="#71717a"
                        value={novaDescricaoServico}
                        onChangeText={setNovaDescricaoServico}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="Preco"
                        placeholderTextColor="#71717a"
                        value={novoPrecoServico}
                        onChangeText={setNovoPrecoServico}
                        keyboardType="decimal-pad"
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="Slots"
                        placeholderTextColor="#71717a"
                        value={novoSlotsServico}
                        onChangeText={setNovoSlotsServico}
                        keyboardType="number-pad"
                        style={styles.input}
                    />
                    {estimativaDuracaoServico ? (
                        <Text style={styles.dicaTexto}>{estimativaDuracaoServico}</Text>
                    ) : null}
                    <TextInput
                        placeholder="Imagem URL (/servicos/arquivo.jpg)"
                        placeholderTextColor="#71717a"
                        value={novaImagemServico}
                        onChangeText={setNovaImagemServico}
                        style={styles.input}
                    />

                    <Pressable style={styles.botaoPrimario} onPress={salvarServico}>
                        <Text style={styles.botaoPrimarioTexto}>
                            {servicoEditandoId ? 'Salvar alteracoes' : 'Cadastrar servico'}
                        </Text>
                    </Pressable>
                    {servicoEditandoId ? (
                        <Pressable style={styles.botaoAcaoDanger} onPress={limparFormularioServico}>
                            <Text style={styles.botaoAcaoTexto}>Cancelar edicao</Text>
                        </Pressable>
                    ) : null}
                </View>

                {servicos.map((servico) => (
                    <View key={servico.id} style={styles.card}>
                        <Text style={styles.cardTitulo}>{servico.nome}</Text>
                        <Text style={styles.cardTexto}>{servico.descricao}</Text>
                        <Text style={styles.cardTexto}>Preco: R$ {Number(servico.preco).toFixed(2)}</Text>
                        <Text style={styles.cardTexto}>Slots: {servico.qtdeSlots}</Text>
                        <Pressable style={styles.botaoAcao} onPress={() => iniciarEdicaoServico(servico)}>
                            <Text style={styles.botaoAcaoTexto}>Editar</Text>
                        </Pressable>
                        <Pressable style={styles.botaoAcaoDanger} onPress={() => excluirServico(servico.id)}>
                            <Text style={styles.botaoAcaoTexto}>Excluir</Text>
                        </Pressable>
                    </View>
                ))}
            </View>
        )
    }

    function renderizarAgenda() {
        const profissionaisAgenda =
            props.role === 'BARBEIRO'
                ? profissionais.filter((p) => p.id === props.profissionalId)
                : profissionais

        return (
            <View style={styles.secao}>
                <Text style={styles.tituloSecao}>Configurar Agenda</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosRow}>
                    {profissionaisAgenda.map((profissional) => {
                        const selecionado = profissionalAgendaId === String(profissional.id)
                        return (
                            <Pressable
                                key={profissional.id}
                                style={[styles.filtroChip, selecionado ? styles.filtroChipAtivo : null]}
                                onPress={() => setProfissionalAgendaId(String(profissional.id))}
                            >
                                <Text style={styles.filtroChipTexto}>{profissional.nome}</Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>

                <Text style={styles.subtitulo}>Dias de trabalho</Text>
                <View style={styles.diasGrid}>
                    {DIAS_SEMANA.map((dia) => {
                        const selecionado = diasTrabalho.includes(dia.valor)
                        return (
                            <Pressable
                                key={dia.valor}
                                style={[styles.diaChip, selecionado ? styles.diaChipAtivo : null]}
                                onPress={() => alternarDiaTrabalho(dia.valor)}
                            >
                                <Text style={styles.diaChipTexto}>{dia.label}</Text>
                            </Pressable>
                        )
                    })}
                </View>

                <TextInput
                    placeholder="Hora inicio (HH:mm)"
                    placeholderTextColor="#71717a"
                    value={horaInicio}
                    onChangeText={setHoraInicio}
                    style={styles.input}
                />
                <TextInput
                    placeholder="Hora fim (HH:mm)"
                    placeholderTextColor="#71717a"
                    value={horaFim}
                    onChangeText={setHoraFim}
                    style={styles.input}
                />
                <TextInput
                    placeholder="Tempo slot (min)"
                    placeholderTextColor="#71717a"
                    value={tempoSlotMinutos}
                    onChangeText={setTempoSlotMinutos}
                    keyboardType="number-pad"
                    style={styles.input}
                />

                <Pressable style={styles.botaoPrimario} onPress={salvarAgenda}>
                    <Text style={styles.botaoPrimarioTexto}>Salvar agenda</Text>
                </Pressable>
            </View>
        )
    }

    function renderizarConteudo() {
        if (abaAtiva === 'AGENDAMENTOS') return renderizarAgendamentos()
        if (abaAtiva === 'SERVICOS') return renderizarServicos()
        if (abaAtiva === 'AGENDA') return renderizarAgenda()
        return <GerenciarBarbeiros key={props.refreshToken ?? 0} />
    }

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>Painel Admin</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
                {abasDisponiveis.map((aba) => renderizarAba(aba, aba))}
            </ScrollView>

            {carregando || acao === 'CARREGANDO' ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#22c55e" size="small" />
                    <Text style={styles.info}>Carregando dados...</Text>
                </View>
            ) : null}

            {acao && acao !== 'CARREGANDO' ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#22c55e" size="small" />
                    <Text style={styles.info}>Processando...</Text>
                </View>
            ) : null}

            {erro ? <Text style={styles.erro}>{erro}</Text> : null}

            {renderizarConteudo()}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
        paddingHorizontal: 16,
        gap: 10,
    },
    titulo: {
        color: '#f4f4f5',
        fontSize: 20,
        fontWeight: '700',
    },
    tabsRow: {
        marginTop: 10,
    },
    tab: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 8,
    },
    tabAtiva: {
        backgroundColor: '#22c55e',
        borderColor: '#22c55e',
    },
    tabTexto: {
        color: '#d4d4d8',
        fontSize: 12,
        fontWeight: '700',
    },
    tabTextoAtivo: {
        color: '#0b0f14',
    },
    secao: {
        marginTop: 10,
        gap: 10,
    },
    tituloSecao: {
        color: '#f4f4f5',
        fontSize: 16,
        fontWeight: '700',
    },
    filtrosRow: {
        maxHeight: 44,
    },
    filtroChip: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginRight: 8,
    },
    filtroChipAtivo: {
        borderColor: '#22c55e',
        backgroundColor: '#14532d',
    },
    filtroChipTexto: {
        color: '#e4e4e7',
        fontSize: 12,
    },
    card: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 12,
        padding: 12,
        backgroundColor: '#111827',
        gap: 4,
    },
    cardTitulo: {
        color: '#fafafa',
        fontSize: 15,
        fontWeight: '700',
    },
    cardTexto: {
        color: '#d4d4d8',
        fontSize: 13,
    },
    dicaTexto: {
        color: '#a1a1aa',
        fontSize: 12,
        marginTop: -4,
        marginBottom: 4,
    },
    acoesRow: {
        marginTop: 6,
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    botaoAcao: {
        backgroundColor: '#22c55e',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    botaoAcaoDanger: {
        backgroundColor: '#ef4444',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    botaoAcaoTexto: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    formCard: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 12,
        padding: 12,
        gap: 10,
        backgroundColor: '#0f172a',
    },
    input: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 10,
        color: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: '#111827',
    },
    botaoPrimario: {
        backgroundColor: '#22c55e',
        borderRadius: 10,
        paddingVertical: 10,
    },
    botaoPrimarioTexto: {
        color: '#0b0f14',
        textAlign: 'center',
        fontWeight: '700',
    },
    subtitulo: {
        color: '#d4d4d8',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 4,
    },
    diasGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    diaChip: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    diaChipAtivo: {
        borderColor: '#22c55e',
        backgroundColor: '#14532d',
    },
    diaChipTexto: {
        color: '#e4e4e7',
        fontSize: 12,
        fontWeight: '700',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    info: {
        color: '#a1a1aa',
        fontSize: 12,
    },
    erro: {
        color: '#f87171',
        fontSize: 12,
    },
})