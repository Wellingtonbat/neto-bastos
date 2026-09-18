import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { Profissional, Servico } from '@neto-bastos/core'
import useAPI from '@/src/data/hooks/useAPI'
import useAgendamento from '@/src/data/hooks/useAgendamento'
import Passos from '../agendamento/Passos'
import ProfissionalInput from '../agendamento/ProfissionalInput'
import ServicosInput from '../agendamento/ServicosInput'
import DataInput from '../agendamento/DataInput'

export interface ClienteAdmin {
    id: number
    nome: string
    email: string
    telefone?: string | null
    clienteRecorrente?: boolean
}

const DIAS_SEMANA = [
    { valor: 0, label: 'Dom' },
    { valor: 1, label: 'Seg' },
    { valor: 2, label: 'Ter' },
    { valor: 3, label: 'Qua' },
    { valor: 4, label: 'Qui' },
    { valor: 5, label: 'Sex' },
    { valor: 6, label: 'Sab' },
]

interface SerieRecorrenteApi {
    id: number
    emailCliente: string
    nomeCliente: string
    diaSemana: number
    horario: string
    profissional: { id: number; nome: string }
}

interface ClientesTabProps {
    profissionais: Profissional[]
    servicos: Servico[]
    aoAgendarComSucesso?: () => void
}

export default function ClientesTab(props: ClientesTabProps) {
    const { httpGet, httpPost, httpPatch, httpDelete } = useAPI()
    const {
        profissional,
        servicos,
        data,
        carregandoHorarios,
        selecionarProfissional,
        selecionarServicos,
        selecionarData,
        quantidadeDeSlots,
        agendar,
    } = useAgendamento()

    const [clientes, setClientes] = useState<ClienteAdmin[]>([])
    const [carregandoClientes, setCarregandoClientes] = useState(false)
    const [filtro, setFiltro] = useState('')
    const [clienteSelecionado, setClienteSelecionado] = useState<ClienteAdmin | null>(null)

    const [permiteProximoPasso, setPermiteProximoPasso] = useState(false)
    const [avancarAutomaticamente, setAvancarAutomaticamente] = useState(0)
    const [reiniciarPassos, setReiniciarPassos] = useState(0)
    const [agendando, setAgendando] = useState(false)

    const [series, setSeries] = useState<SerieRecorrenteApi[]>([])
    const [carregandoSeries, setCarregandoSeries] = useState(false)
    const [profissionalIdRecorrente, setProfissionalIdRecorrente] = useState<number | null>(null)
    const [diaSemana, setDiaSemana] = useState(6)
    const [horarioRecorrente, setHorarioRecorrente] = useState('08:00')
    const [servicoIdsRecorrente, setServicoIdsRecorrente] = useState<number[]>([])
    const [salvandoSerie, setSalvandoSerie] = useState(false)

    const [resetandoSenha, setResetandoSenha] = useState(false)

    const carregarClientes = useCallback(async () => {
        try {
            setCarregandoClientes(true)
            const dados = await httpGet('auth/clientes')
            setClientes(dados ?? [])
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel carregar os clientes.')
        } finally {
            setCarregandoClientes(false)
        }
    }, [httpGet])

    useEffect(() => {
        carregarClientes()
    }, [carregarClientes])

    const clientesFiltrados = useMemo(() => {
        const termo = filtro.trim().toLowerCase()
        if (!termo) return clientes
        return clientes.filter(
            (c) => c.nome.toLowerCase().includes(termo) || c.email.toLowerCase().includes(termo)
        )
    }, [clientes, filtro])

    async function carregarSeries() {
        try {
            setCarregandoSeries(true)
            const dados = await httpGet('agendamentos-recorrentes')
            setSeries(dados ?? [])
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel carregar os clientes fixos.')
        } finally {
            setCarregandoSeries(false)
        }
    }

    function selecionarCliente(cliente: ClienteAdmin) {
        setClienteSelecionado(cliente)
        setPermiteProximoPasso(false)
        setReiniciarPassos((v) => v + 1)
        setProfissionalIdRecorrente(null)
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
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel atualizar o cliente.')
        }
    }

    function profissionalMudou(p: Profissional) {
        selecionarProfissional(p)
        setPermiteProximoPasso(!!p)
        setAvancarAutomaticamente((v) => v + 1)
    }

    function servicosMudou(s: Servico[]) {
        selecionarServicos(s)
        setPermiteProximoPasso(s.length > 0)
        setAvancarAutomaticamente((v) => v + 1)
    }

    function dataMudou(d: Date | null) {
        selecionarData(d)
        if (!d) {
            setPermiteProximoPasso(false)
            return
        }
        const horaValida = d.getHours() >= 8 && d.getHours() <= 21
        setPermiteProximoPasso(horaValida)
        if (horaValida) {
            confirmarAgendamento()
        }
    }

    async function confirmarAgendamento() {
        if (!clienteSelecionado) return
        try {
            setAgendando(true)
            await agendar(clienteSelecionado.email)
            Alert.alert('Sucesso', 'Agendamento criado com sucesso.')
            setPermiteProximoPasso(false)
            setReiniciarPassos((v) => v + 1)
            props.aoAgendarComSucesso?.()
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel criar o agendamento.')
        } finally {
            setAgendando(false)
        }
    }

    function alternarServicoRecorrente(id: number) {
        setServicoIdsRecorrente((atual) =>
            atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]
        )
    }

    async function criarSerie() {
        if (!clienteSelecionado) return
        if (!clienteSelecionado.clienteRecorrente) {
            Alert.alert('Cliente não é fixo', 'Marque o cliente como fixo antes de cadastrar uma série.')
            return
        }
        if (!profissionalIdRecorrente) {
            Alert.alert('Selecione o barbeiro')
            return
        }
        if (servicoIdsRecorrente.length === 0) {
            Alert.alert('Selecione ao menos um serviço')
            return
        }

        try {
            setSalvandoSerie(true)
            const serie = await httpPost('agendamentos-recorrentes', {
                emailCliente: clienteSelecionado.email,
                nomeCliente: clienteSelecionado.nome,
                telefoneCliente: clienteSelecionado.telefone,
                profissionalId: profissionalIdRecorrente,
                diaSemana,
                horario: horarioRecorrente,
                servicoIds: servicoIdsRecorrente,
            })
            setServicoIdsRecorrente([])
            await carregarSeries()
            const datasComConflito: string[] = serie?.datasComConflito ?? []
            if (datasComConflito.length > 0) {
                Alert.alert(
                    'Cliente fixo cadastrado',
                    `${datasComConflito.length} data(s) já tinham agendamento e foram puladas: ${datasComConflito.join(', ')}.`
                )
            } else {
                Alert.alert('Sucesso', 'Cliente fixo cadastrado com sucesso.')
            }
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel cadastrar o cliente fixo.')
        } finally {
            setSalvandoSerie(false)
        }
    }

    function confirmarCancelarSerie(id: number) {
        Alert.alert(
            'Cancelar cliente fixo',
            'Os próximos agendamentos dele serão cancelados. Continuar?',
            [
                { text: 'Voltar', style: 'cancel' },
                { text: 'Cancelar série', style: 'destructive', onPress: () => cancelarSerie(id) },
            ]
        )
    }

    async function cancelarSerie(id: number) {
        try {
            await httpDelete(`agendamentos-recorrentes/${id}`)
            await carregarSeries()
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel cancelar.')
        }
    }

    function confirmarResetarSenha() {
        if (!clienteSelecionado) return
        Alert.alert(
            'Resetar senha',
            `Resetar a senha de ${clienteSelecionado.nome}? Na próxima vez que essa pessoa tentar entrar, a senha que ela digitar será cadastrada como nova senha.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Resetar', style: 'destructive', onPress: resetarSenha },
            ]
        )
    }

    async function resetarSenha() {
        if (!clienteSelecionado) return
        try {
            setResetandoSenha(true)
            await httpPatch(`auth/usuarios/${clienteSelecionado.id}/resetar-senha`, {})
            Alert.alert('Sucesso', 'Senha resetada com sucesso.')
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel resetar a senha.')
        } finally {
            setResetandoSenha(false)
        }
    }

    const seriesDoCliente = useMemo(
        () => series.filter((s) => s.emailCliente === clienteSelecionado?.email),
        [series, clienteSelecionado]
    )

    return (
        <View style={styles.container}>
            <Text style={styles.tituloSecao}>Clientes</Text>
            <TextInput
                placeholder="Buscar cliente por nome ou e-mail"
                placeholderTextColor="#71717a"
                value={filtro}
                onChangeText={setFiltro}
                style={styles.input}
            />
            {carregandoClientes ? <ActivityIndicator color="#22c55e" /> : null}
            <FlatList
                data={clientesFiltrados}
                keyExtractor={(item) => String(item.id)}
                style={styles.lista}
                nestedScrollEnabled
                ListEmptyComponent={<Text style={styles.vazio}>Nenhum cliente encontrado.</Text>}
                renderItem={({ item }) => (
                    <Pressable
                        style={[
                            styles.item,
                            clienteSelecionado?.id === item.id ? styles.itemSelecionado : null,
                        ]}
                        onPress={() => selecionarCliente(item)}
                    >
                        <Text style={styles.itemNome}>{item.nome}</Text>
                        <Text style={styles.itemEmail}>{item.email}</Text>
                        {item.clienteRecorrente ? <Text style={styles.itemFixo}>✓ Cliente fixo</Text> : null}
                    </Pressable>
                )}
            />

            {clienteSelecionado ? (
                <View style={styles.detalhe}>
                    <Text style={styles.detalheNome}>{clienteSelecionado.nome}</Text>
                    <Text style={styles.detalheEmail}>{clienteSelecionado.email}</Text>

                    <View style={styles.linha}>
                        <Pressable
                            style={[
                                styles.chip,
                                clienteSelecionado.clienteRecorrente ? styles.chipAtivo : null,
                            ]}
                            onPress={() => alternarClienteRecorrente(clienteSelecionado)}
                        >
                            <Text style={styles.chipTexto}>
                                {clienteSelecionado.clienteRecorrente ? '✓ Cliente fixo' : 'Marcar como fixo'}
                            </Text>
                        </Pressable>
                        <Pressable
                            style={styles.botaoAcaoDanger}
                            onPress={confirmarResetarSenha}
                            disabled={resetandoSenha}
                        >
                            <Text style={styles.botaoAcaoTexto}>
                                {resetandoSenha ? 'Resetando...' : 'Resetar senha'}
                            </Text>
                        </Pressable>
                    </View>

                    <Text style={styles.subtitulo}>Agendar para este cliente</Text>
                    <Passos
                        labels={['Profissional', 'Serviço', 'Horário']}
                        permiteProximoPasso={permiteProximoPasso}
                        permiteProximoPassoMudou={setPermiteProximoPasso}
                        avancarAutomaticamente={avancarAutomaticamente}
                        reiniciar={reiniciarPassos}
                        finalizar={confirmarAgendamento}
                    >
                        <ProfissionalInput
                            profissionais={props.profissionais}
                            profissional={profissional}
                            profissionalMudou={profissionalMudou}
                        />
                        <ServicosInput
                            todosServicos={props.servicos}
                            servicos={servicos}
                            servicosMudou={servicosMudou}
                        />
                        <DataInput
                            data={data}
                            dataMudou={dataMudou}
                            quantidadeDeSlots={quantidadeDeSlots()}
                            carregandoHorarios={carregandoHorarios}
                        />
                    </Passos>
                    {agendando ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color="#22c55e" />
                            <Text style={styles.loadingTexto}>Criando agendamento...</Text>
                        </View>
                    ) : null}

                    <Text style={styles.subtitulo}>Cliente fixo (horário recorrente)</Text>
                    {!clienteSelecionado.clienteRecorrente ? (
                        <Text style={styles.dica}>
                            Marque o cliente como fixo acima para cadastrar uma série.
                        </Text>
                    ) : (
                        <>
                            <View style={styles.linha}>
                                {props.profissionais.map((p) => (
                                    <Pressable
                                        key={p.id}
                                        style={[
                                            styles.chip,
                                            profissionalIdRecorrente === p.id ? styles.chipAtivo : null,
                                        ]}
                                        onPress={() => setProfissionalIdRecorrente(p.id)}
                                    >
                                        <Text style={styles.chipTexto}>{p.nome}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <View style={styles.linha}>
                                {DIAS_SEMANA.map((dia) => (
                                    <Pressable
                                        key={dia.valor}
                                        style={[styles.chip, diaSemana === dia.valor ? styles.chipAtivo : null]}
                                        onPress={() => setDiaSemana(dia.valor)}
                                    >
                                        <Text style={styles.chipTexto}>{dia.label}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <TextInput
                                placeholder="Horario (HH:mm)"
                                placeholderTextColor="#71717a"
                                value={horarioRecorrente}
                                onChangeText={setHorarioRecorrente}
                                style={styles.input}
                            />

                            <View style={styles.linha}>
                                {props.servicos.map((servico) => (
                                    <Pressable
                                        key={servico.id}
                                        style={[
                                            styles.chip,
                                            servicoIdsRecorrente.includes(servico.id) ? styles.chipAtivo : null,
                                        ]}
                                        onPress={() => alternarServicoRecorrente(servico.id)}
                                    >
                                        <Text style={styles.chipTexto}>{servico.nome}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Pressable style={styles.botaoPrimario} onPress={criarSerie}>
                                <Text style={styles.botaoPrimarioTexto}>
                                    {salvandoSerie ? 'Salvando...' : 'Cadastrar série recorrente'}
                                </Text>
                            </Pressable>
                        </>
                    )}

                    <Text style={styles.subtitulo}>Séries ativas deste cliente</Text>
                    {carregandoSeries ? (
                        <ActivityIndicator color="#22c55e" />
                    ) : seriesDoCliente.length === 0 ? (
                        <Text style={styles.dica}>Nenhuma série recorrente cadastrada.</Text>
                    ) : (
                        seriesDoCliente.map((serie) => (
                            <View key={serie.id} style={styles.itemSerie}>
                                <Text style={styles.itemSerieTexto}>
                                    {DIAS_SEMANA.find((d) => d.valor === serie.diaSemana)?.label}{' '}
                                    {serie.horario} com {serie.profissional?.nome}
                                </Text>
                                <Pressable onPress={() => confirmarCancelarSerie(serie.id)}>
                                    <Text style={styles.linkCancelar}>cancelar</Text>
                                </Pressable>
                            </View>
                        ))
                    )}
                </View>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
    },
    tituloSecao: {
        color: '#e4e4e7',
        fontSize: 18,
        fontWeight: '700',
    },
    input: {
        backgroundColor: '#18181b',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: 'white',
    },
    lista: {
        maxHeight: 280,
    },
    vazio: {
        color: '#71717a',
        textAlign: 'center',
        paddingVertical: 10,
    },
    item: {
        backgroundColor: '#18181b',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    itemSelecionado: {
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
    },
    itemNome: {
        color: 'white',
        fontSize: 14,
    },
    itemEmail: {
        color: '#a1a1aa',
        fontSize: 12,
    },
    itemFixo: {
        color: '#22c55e',
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
    detalhe: {
        gap: 8,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272a',
        paddingTop: 14,
    },
    detalheNome: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    detalheEmail: {
        color: '#a1a1aa',
        fontSize: 12,
        marginBottom: 4,
    },
    subtitulo: {
        color: '#d4d4d8',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 10,
    },
    dica: {
        color: '#a1a1aa',
        fontSize: 12,
    },
    linha: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
    },
    chip: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    chipAtivo: {
        borderColor: '#22c55e',
        backgroundColor: '#14532d',
    },
    chipTexto: {
        color: '#e4e4e7',
        fontSize: 12,
        fontWeight: '700',
    },
    botaoAcaoDanger: {
        backgroundColor: '#7f1d1d',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    botaoAcaoTexto: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    botaoPrimario: {
        backgroundColor: '#22c55e',
        borderRadius: 10,
        paddingVertical: 10,
        marginTop: 4,
    },
    botaoPrimarioTexto: {
        color: '#0b0f14',
        textAlign: 'center',
        fontWeight: '700',
    },
    loadingContainer: {
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    loadingTexto: {
        color: '#a1a1aa',
        fontSize: 12,
    },
    itemSerie: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 12,
        padding: 10,
        gap: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemSerieTexto: {
        color: '#d4d4d8',
        fontSize: 12,
        flex: 1,
    },
    linkCancelar: {
        color: '#f87171',
        fontSize: 12,
        fontWeight: '700',
    },
})
