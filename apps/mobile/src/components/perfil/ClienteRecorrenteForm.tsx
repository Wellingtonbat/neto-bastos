import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Profissional, Servico } from '@neto-bastos/core'
import useAPI from '@/src/data/hooks/useAPI'
import { ClienteAdmin } from '../agendamento/ClienteInput'

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
    nomeCliente: string
    diaSemana: number
    horario: string
    profissional: { id: number; nome: string }
}

interface ClienteRecorrenteFormProps {
    profissionais: Profissional[]
    servicos: Servico[]
}

export default function ClienteRecorrenteForm(props: ClienteRecorrenteFormProps) {
    const { httpGet, httpPost, httpPatch, httpDelete } = useAPI()

    const [clientes, setClientes] = useState<ClienteAdmin[]>([])
    const [series, setSeries] = useState<SerieRecorrenteApi[]>([])
    const [carregando, setCarregando] = useState(false)
    const [erro, setErro] = useState('')

    const [emailCliente, setEmailCliente] = useState('')
    const [profissionalId, setProfissionalId] = useState<number | null>(null)
    const [diaSemana, setDiaSemana] = useState(6)
    const [horario, setHorario] = useState('08:00')
    const [servicoIds, setServicoIds] = useState<number[]>([])
    const [salvando, setSalvando] = useState(false)

    const carregarTudo = useCallback(async () => {
        try {
            setCarregando(true)
            const [clientesApi, seriesApi] = await Promise.all([
                httpGet('auth/clientes'),
                httpGet('agendamentos-recorrentes'),
            ])
            setClientes(clientesApi ?? [])
            setSeries(seriesApi ?? [])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel carregar os clientes fixos.')
        } finally {
            setCarregando(false)
        }
    }, [httpGet])

    useEffect(() => {
        carregarTudo()
    }, [carregarTudo])

    const clientesRecorrentes = clientes.filter((c) => c.clienteRecorrente)

    async function alternarRecorrente(cliente: ClienteAdmin) {
        try {
            const atualizado = await httpPatch(`auth/clientes/${cliente.id}/recorrente`, {
                clienteRecorrente: !cliente.clienteRecorrente,
            })
            setClientes((atual) => atual.map((c) => (c.id === cliente.id ? atualizado : c)))
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel atualizar o cliente.')
        }
    }

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
            setErro('Selecione ao menos um servico.')
            return
        }

        try {
            setSalvando(true)
            await httpPost('agendamentos-recorrentes', {
                emailCliente: cliente.email,
                nomeCliente: cliente.nome,
                telefoneCliente: cliente.telefone,
                profissionalId,
                diaSemana,
                horario,
                servicoIds,
            })
            setEmailCliente('')
            setServicoIds([])
            await carregarTudo()
            Alert.alert('Sucesso', 'Cliente fixo cadastrado com sucesso.')
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel cadastrar o cliente fixo.')
        } finally {
            setSalvando(false)
        }
    }

    async function cancelarSerie(id: number) {
        try {
            await httpDelete(`agendamentos-recorrentes/${id}`)
            await carregarTudo()
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel cancelar.')
        }
    }

    return (
        <View style={styles.container}>
            {carregando ? <ActivityIndicator color="#22c55e" /> : null}
            <Text style={styles.dica}>
                Marque um cliente como &quot;fixo&quot; na lista de clientes abaixo antes de criar a
                serie recorrente.
            </Text>

            <Text style={styles.subtitulo}>Clientes marcados como fixo</Text>
            {clientes.map((cliente) => (
                <Pressable
                    key={cliente.id}
                    style={[styles.chip, cliente.clienteRecorrente ? styles.chipAtivo : null]}
                    onPress={() => alternarRecorrente(cliente)}
                >
                    <Text style={styles.chipTexto}>
                        {cliente.clienteRecorrente ? '✓ ' : ''}
                        {cliente.nome}
                    </Text>
                </Pressable>
            ))}

            <Text style={styles.subtitulo}>Nova serie recorrente</Text>
            {clientesRecorrentes.map((cliente) => (
                <Pressable
                    key={cliente.id}
                    style={[styles.chip, emailCliente === cliente.email ? styles.chipAtivo : null]}
                    onPress={() => setEmailCliente(cliente.email)}
                >
                    <Text style={styles.chipTexto}>{cliente.nome}</Text>
                </Pressable>
            ))}

            <View style={styles.linha}>
                {props.profissionais.map((p) => (
                    <Pressable
                        key={p.id}
                        style={[styles.chip, profissionalId === p.id ? styles.chipAtivo : null]}
                        onPress={() => setProfissionalId(p.id)}
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
                value={horario}
                onChangeText={setHorario}
                style={styles.input}
            />

            <View style={styles.linha}>
                {props.servicos.map((servico) => (
                    <Pressable
                        key={servico.id}
                        style={[styles.chip, servicoIds.includes(servico.id) ? styles.chipAtivo : null]}
                        onPress={() => alternarServico(servico.id)}
                    >
                        <Text style={styles.chipTexto}>{servico.nome}</Text>
                    </Pressable>
                ))}
            </View>

            {erro ? <Text style={styles.erro}>{erro}</Text> : null}

            <Pressable style={styles.botaoPrimario} onPress={criarSerie}>
                <Text style={styles.botaoPrimarioTexto}>
                    {salvando ? 'Salvando...' : 'Cadastrar cliente fixo'}
                </Text>
            </Pressable>

            <Text style={styles.subtitulo}>Series ativas</Text>
            {series.length === 0 ? (
                <Text style={styles.dica}>Nenhum cliente fixo cadastrado.</Text>
            ) : (
                series.map((serie) => (
                    <View key={serie.id} style={styles.itemSerie}>
                        <Text style={styles.itemSerieTexto}>
                            {serie.nomeCliente} — {DIAS_SEMANA.find((d) => d.valor === serie.diaSemana)?.label}{' '}
                            {serie.horario} com {serie.profissional?.nome}
                        </Text>
                        <Pressable onPress={() => cancelarSerie(serie.id)}>
                            <Text style={styles.linkCancelar}>cancelar</Text>
                        </Pressable>
                    </View>
                ))
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: 8,
        marginTop: 10,
    },
    dica: {
        color: '#a1a1aa',
        fontSize: 12,
    },
    subtitulo: {
        color: '#d4d4d8',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 8,
    },
    linha: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 4,
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
    input: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 10,
        color: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: '#111827',
    },
    erro: {
        color: '#f87171',
        fontSize: 12,
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
    itemSerie: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 12,
        padding: 10,
        gap: 6,
    },
    itemSerieTexto: {
        color: '#d4d4d8',
        fontSize: 12,
    },
    linkCancelar: {
        color: '#f87171',
        fontSize: 12,
        fontWeight: '700',
    },
})
