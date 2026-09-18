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
import ClientesTab from './ClientesTab'
import useAgendamento from '@/src/data/hooks/useAgendamento'
import { useFocusEffect } from '@react-navigation/native'

type AbaAdmin = 'AGENDAMENTOS' | 'CLIENTES' | 'SERVICOS' | 'BARBEIROS' | 'AGENDA'
type StatusAgendamento = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO'

function dataYYYYMMDD(data: Date) {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
}
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

const REGEX_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/

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
    const [filtroData, setFiltroData] = useState<string>(dataYYYYMMDD(new Date()))

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
    const [temAlmoco, setTemAlmoco] = useState(false)
    const [horaAlmocoInicio, setHoraAlmocoInicio] = useState('12:00')
    const [horaAlmocoFim, setHoraAlmocoFim] = useState('13:00')

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

    const isDono = props.role === 'DONO'
    const podeExcluir = props.role === 'DONO' || props.role === 'BARBEIRO'

    const abasDisponiveis = useMemo(() => {
        const base: AbaAdmin[] = ['AGENDAMENTOS', 'CLIENTES', 'SERVICOS', 'AGENDA']
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
        if (filtroData) params.set('data', filtroData)

        const query = params.toString()
        const data = await httpGet(`agendamentos${query ? `?${query}` : ''}`)
        setAgendamentos(data ?? [])
    }, [filtroProfissional, filtroStatus, filtroData, httpGet])

    const carregarServicos = useCallback(async () => {
        const data = await httpGet('servico')
        setServicos(data ?? [])
    }, [httpGet])

    const carregarTudo = useCallback(async () => {
        try {
            setCarregando(true)
            setAcao('CARREGANDO')
            setErro('')
            const resultados = await Promise.allSettled([
                carregarAgendamentos(),
                carregarProfissionais(),
                carregarServicos(),
            ])
            const falha = resultados.find((r) => r.status === 'rejected') as
                | PromiseRejectedResult
                | undefined
            if (falha) {
                setErro(falha.reason?.message ?? 'Nao foi possivel carregar parte do painel admin.')
            }
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
        // So pre-seleciona automaticamente quando ha uma unica opcao
        // possivel (barbeiro editando a propria agenda). Pra DONO/
        // FUNCIONARIO, que podem editar qualquer barbeiro, deixamos sem
        // selecao ate escolher explicitamente -- selecionar o primeiro da
        // lista por padrao ja causou edicao acidental na agenda errada.
        if (props.role !== 'BARBEIRO') return
        if (profissionalAgendaId) return

        const idPadrao = String(props.profissionalId ?? '')
        if (idPadrao) {
            setProfissionalAgendaId(idPadrao)
        }
    }, [props.profissionalId, props.role, profissionalAgendaId])

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
            const [semanais, excecoesApi]: [HorarioSemanalApi[], ExcecaoAgendaApi[]] = await Promise.all([
                httpGet(`profissional/${profissionalAgendaId}/horarios-semanais`),
                httpGet(`profissional/${profissionalAgendaId}/excecoes`),
            ])

            setDiasSemanais(
                DIAS_SEMANA.map((dia) => {
                    const existente = (semanais ?? []).find((s) => s.diaSemana === dia.valor)
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
            setExcecoes(excecoesApi ?? [])
        } catch (e) {
            // Mantem o estado atual se a listagem falhar.
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
            Alert.alert('Sucesso', 'Horarios por dia da semana atualizados com sucesso.')
        } catch (e: any) {
            setErroSemanais(e?.message ?? 'Nao foi possivel salvar os horarios por dia.')
        } finally {
            setSalvandoSemanais(false)
        }
    }

    async function adicionarExcecao() {
        setErroExcecao('')

        if (!/^\d{4}-\d{2}-\d{2}$/.test(novaExcecaoData)) {
            setErroExcecao('Informe a data no formato YYYY-MM-DD.')
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
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel remover a excecao.')
        }
    }

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

            const erroJanela = validarJanela(horaInicio, horaFim, temAlmoco, horaAlmocoInicio, horaAlmocoFim)
            if (erroJanela) {
                Alert.alert('Horario invalido', erroJanela)
                return
            }

            if (!Number.isInteger(slot) || slot < 5 || slot > 120) {
                Alert.alert('Tempo de slot invalido', 'Tempo por slot deve ser um numero inteiro entre 5 e 120.')
                return
            }

            const nomeBarbeiro = profissionais.find((p) => p.id === profissionalId)?.nome ?? 'barbeiro'

            setAcao('SALVAR_AGENDA')
            await httpPatch(`profissional/${profissionalId}/agenda`, {
                diasTrabalho,
                horaInicio,
                horaFim,
                horaAlmocoInicio: temAlmoco ? horaAlmocoInicio : null,
                horaAlmocoFim: temAlmoco ? horaAlmocoFim : null,
                tempoSlotMinutos: slot,
            })

            await carregarProfissionais()
            Alert.alert('Sucesso', `Agenda de ${nomeBarbeiro} atualizada com sucesso.`)
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
                    {[
                        { label: 'Hoje', valor: dataYYYYMMDD(new Date()) },
                        { label: 'Amanhã', valor: dataYYYYMMDD(new Date(Date.now() + 86400000)) },
                        { label: 'Todas as datas', valor: '' },
                    ].map((opcao) => {
                        const selecionado = filtroData === opcao.valor
                        return (
                            <Pressable
                                key={opcao.label}
                                style={[styles.filtroChip, selecionado ? styles.filtroChipAtivo : null]}
                                onPress={() => setFiltroData(opcao.valor)}
                            >
                                <Text style={styles.filtroChipTexto}>{opcao.label}</Text>
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
                            {(agendamento.status ?? 'PENDENTE') === 'PENDENTE' ? (
                                <>
                                    <Pressable
                                        style={styles.botaoAcao}
                                        onPress={() => atualizarStatusAgendamento(agendamento.id, 'CONFIRMADO')}
                                    >
                                        <Text style={styles.botaoAcaoTexto}>Confirmar</Text>
                                    </Pressable>

                                    <Pressable
                                        style={styles.botaoAcao}
                                        onPress={() => atualizarStatusAgendamento(agendamento.id, 'CANCELADO')}
                                    >
                                        <Text style={styles.botaoAcaoTexto}>Cancelar</Text>
                                    </Pressable>
                                </>
                            ) : null}

                            {podeExcluir ? (
                                <Pressable style={styles.botaoAcaoDanger} onPress={() => excluirAgendamento(agendamento.id)}>
                                    <Text style={styles.botaoAcaoTexto}>Excluir</Text>
                                </Pressable>
                            ) : null}
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

                <Pressable
                    style={[styles.diaChip, temAlmoco ? styles.diaChipAtivo : null, { alignSelf: 'flex-start' }]}
                    onPress={() => setTemAlmoco((v) => !v)}
                >
                    <Text style={styles.diaChipTexto}>
                        {temAlmoco ? '✓ Horario de almoco definido' : 'Definir horario de almoco'}
                    </Text>
                </Pressable>

                {temAlmoco ? (
                    <>
                        <TextInput
                            placeholder="Almoco inicio (HH:mm)"
                            placeholderTextColor="#71717a"
                            value={horaAlmocoInicio}
                            onChangeText={setHoraAlmocoInicio}
                            style={styles.input}
                        />
                        <TextInput
                            placeholder="Almoco fim (HH:mm)"
                            placeholderTextColor="#71717a"
                            value={horaAlmocoFim}
                            onChangeText={setHoraAlmocoFim}
                            style={styles.input}
                        />
                    </>
                ) : null}

                <Pressable style={styles.botaoPrimario} onPress={salvarAgenda}>
                    <Text style={styles.botaoPrimarioTexto}>Salvar agenda</Text>
                </Pressable>

                {profissionalAgendaId ? renderizarHorariosSemanais() : null}
                {profissionalAgendaId ? renderizarExcecoesAgenda() : null}
            </View>
        )
    }

    function renderizarHorariosSemanais() {
        return (
            <View style={[styles.formCard, { marginTop: 10 }]}>
                <Text style={styles.tituloSecao}>Horários por dia da semana</Text>
                <Text style={styles.dicaTexto}>
                    Sobrescreve o horário base só nos dias marcados abaixo.
                </Text>

                {DIAS_SEMANA.map((dia, indice) => {
                    const form = diasSemanais[indice]
                    return (
                        <View key={dia.valor} style={[styles.card, { gap: 8 }]}>
                            <Pressable
                                style={[styles.diaChip, form.ativo ? styles.diaChipAtivo : null, { alignSelf: 'flex-start' }]}
                                onPress={() => alterarDiaSemanal(indice, { ativo: !form.ativo })}
                            >
                                <Text style={styles.diaChipTexto}>
                                    {form.ativo ? `✓ ${dia.label}` : dia.label}
                                </Text>
                            </Pressable>

                            {form.ativo ? (
                                <>
                                    <TextInput
                                        placeholder="Hora inicio (HH:mm)"
                                        placeholderTextColor="#71717a"
                                        value={form.horaInicio}
                                        onChangeText={(v) => alterarDiaSemanal(indice, { horaInicio: v })}
                                        style={styles.input}
                                    />
                                    <TextInput
                                        placeholder="Hora fim (HH:mm)"
                                        placeholderTextColor="#71717a"
                                        value={form.horaFim}
                                        onChangeText={(v) => alterarDiaSemanal(indice, { horaFim: v })}
                                        style={styles.input}
                                    />
                                    <TextInput
                                        placeholder="Tempo slot (min, opcional)"
                                        placeholderTextColor="#71717a"
                                        value={form.tempoSlotMinutos}
                                        onChangeText={(v) => alterarDiaSemanal(indice, { tempoSlotMinutos: v })}
                                        keyboardType="number-pad"
                                        style={styles.input}
                                    />

                                    <Pressable
                                        style={[styles.diaChip, form.temAlmoco ? styles.diaChipAtivo : null, { alignSelf: 'flex-start' }]}
                                        onPress={() => alterarDiaSemanal(indice, { temAlmoco: !form.temAlmoco })}
                                    >
                                        <Text style={styles.diaChipTexto}>
                                            {form.temAlmoco ? '✓ Almoço diferente' : 'Almoço diferente neste dia'}
                                        </Text>
                                    </Pressable>

                                    {form.temAlmoco ? (
                                        <>
                                            <TextInput
                                                placeholder="Almoco inicio (HH:mm)"
                                                placeholderTextColor="#71717a"
                                                value={form.horaAlmocoInicio}
                                                onChangeText={(v) => alterarDiaSemanal(indice, { horaAlmocoInicio: v })}
                                                style={styles.input}
                                            />
                                            <TextInput
                                                placeholder="Almoco fim (HH:mm)"
                                                placeholderTextColor="#71717a"
                                                value={form.horaAlmocoFim}
                                                onChangeText={(v) => alterarDiaSemanal(indice, { horaAlmocoFim: v })}
                                                style={styles.input}
                                            />
                                        </>
                                    ) : null}
                                </>
                            ) : null}
                        </View>
                    )
                })}

                {erroSemanais ? <Text style={styles.erro}>{erroSemanais}</Text> : null}

                <Pressable style={styles.botaoPrimario} onPress={salvarHorariosSemanais}>
                    <Text style={styles.botaoPrimarioTexto}>
                        {salvandoSemanais ? 'Salvando...' : 'Salvar horários por dia'}
                    </Text>
                </Pressable>
            </View>
        )
    }

    function renderizarExcecoesAgenda() {
        return (
            <View style={[styles.formCard, { marginTop: 10 }]}>
                <Text style={styles.tituloSecao}>Exceções (feriados, imprevistos)</Text>
                <Text style={styles.dicaTexto}>
                    Sobrescreve o horário (ou fecha a agenda) numa data específica.
                </Text>

                {excecoes.length === 0 ? (
                    <Text style={styles.info}>Nenhuma exceção cadastrada.</Text>
                ) : (
                    excecoes.map((excecao) => (
                        <View key={excecao.id} style={styles.card}>
                            <Text style={styles.cardTexto}>
                                {excecao.data.slice(0, 10)} —{' '}
                                {excecao.fechado ? 'fechado' : `${excecao.horaInicio} às ${excecao.horaFim}`}
                            </Text>
                            <View style={styles.acoesRow}>
                                <Pressable
                                    style={styles.botaoAcaoDanger}
                                    onPress={() => removerExcecao(excecao.data)}
                                >
                                    <Text style={styles.botaoAcaoTexto}>Remover</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))
                )}

                <TextInput
                    placeholder="Data (YYYY-MM-DD)"
                    placeholderTextColor="#71717a"
                    value={novaExcecaoData}
                    onChangeText={setNovaExcecaoData}
                    style={styles.input}
                />

                <Pressable
                    style={[styles.diaChip, novaExcecaoFechado ? styles.diaChipAtivo : null, { alignSelf: 'flex-start' }]}
                    onPress={() => setNovaExcecaoFechado((v) => !v)}
                >
                    <Text style={styles.diaChipTexto}>
                        {novaExcecaoFechado ? '✓ Fechar o dia inteiro' : 'Fechar o dia inteiro'}
                    </Text>
                </Pressable>

                {!novaExcecaoFechado ? (
                    <>
                        <TextInput
                            placeholder="Hora inicio (HH:mm)"
                            placeholderTextColor="#71717a"
                            value={novaExcecaoHoraInicio}
                            onChangeText={setNovaExcecaoHoraInicio}
                            style={styles.input}
                        />
                        <TextInput
                            placeholder="Hora fim (HH:mm)"
                            placeholderTextColor="#71717a"
                            value={novaExcecaoHoraFim}
                            onChangeText={setNovaExcecaoHoraFim}
                            style={styles.input}
                        />
                    </>
                ) : null}

                {erroExcecao ? <Text style={styles.erro}>{erroExcecao}</Text> : null}

                <Pressable style={styles.botaoPrimario} onPress={adicionarExcecao}>
                    <Text style={styles.botaoPrimarioTexto}>
                        {salvandoExcecao ? 'Salvando...' : 'Adicionar exceção'}
                    </Text>
                </Pressable>
            </View>
        )
    }

    function renderizarClientes() {
        return (
            <View style={styles.secao}>
                <ClientesTab
                    profissionais={profissionais}
                    servicos={servicos}
                    aoAgendarComSucesso={carregarAgendamentos}
                />
            </View>
        )
    }

    function renderizarConteudo() {
        if (abaAtiva === 'AGENDAMENTOS') return renderizarAgendamentos()
        if (abaAtiva === 'CLIENTES') return renderizarClientes()
        if (abaAtiva === 'SERVICOS') return renderizarServicos()
        if (abaAtiva === 'AGENDA') return renderizarAgenda()
        return <GerenciarBarbeiros key={props.refreshToken ?? 0} />
    }

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>{isDono ? 'Painel Admin' : 'Minha Agenda'}</Text>

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