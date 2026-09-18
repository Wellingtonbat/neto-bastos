import { useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { Agendamento, QrCodeUtils } from '@neto-bastos/core'
import useAPI from '@/src/data/hooks/useAPI'

interface FinalizarAtendimentoModalProps {
    agendamento: Agendamento
    aoFechar: () => void
    aoConcluir: () => void
}

interface DadosPix {
    payload: string
    valor: number
    nomeProfissional: string
}

type Etapa = 'ESCOLHA' | 'QR'

const TAMANHO_QR = 220

export default function FinalizarAtendimentoModal(props: FinalizarAtendimentoModalProps) {
    const { httpGet, httpPatch } = useAPI()
    const [etapa, setEtapa] = useState<Etapa>('ESCOLHA')
    const [carregando, setCarregando] = useState(false)
    const [erro, setErro] = useState('')
    const [dadosPix, setDadosPix] = useState<DadosPix | null>(null)
    const [qrN, setQrN] = useState(0)
    const [trechosQr, setTrechosQr] = useState<Array<{ linha: number; colInicio: number; colFim: number }>>([])

    const valorTotal = props.agendamento.servicos.reduce((total, s) => total + s.preco, 0)

    async function escolherPix() {
        try {
            setCarregando(true)
            setErro('')
            const dados: DadosPix = await httpGet(`agendamentos/${(props.agendamento as any).id}/pix`)
            setDadosPix(dados)
            const qr = QrCodeUtils.gerar(dados.payload)
            setQrN(qr.n)
            setTrechosQr(QrCodeUtils.paraTrechosEscuros(qr.modulos))
            setEtapa('QR')
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel gerar o Pix.')
        } finally {
            setCarregando(false)
        }
    }

    async function concluir() {
        try {
            setCarregando(true)
            setErro('')
            await httpPatch(`agendamentos/${(props.agendamento as any).id}/status`, {
                status: 'CONCLUIDO',
            })
            props.aoConcluir()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel concluir o atendimento.')
        } finally {
            setCarregando(false)
        }
    }

    function confirmarDinheiro() {
        Alert.alert(
            'Confirmar pagamento',
            'Confirmar que o pagamento em dinheiro foi recebido e concluir o atendimento?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Concluir', onPress: concluir },
            ]
        )
    }

    const margem = 4
    const tamanhoModulo = TAMANHO_QR / (qrN + margem * 2)

    return (
        <Modal animationType="slide" visible transparent onRequestClose={props.aoFechar}>
            <View style={styles.fundo}>
                <View style={styles.cartao}>
                    <ScrollView contentContainerStyle={styles.conteudo}>
                        <View style={styles.cabecalho}>
                            <Text style={styles.titulo}>Finalizar atendimento</Text>
                            <Pressable onPress={props.aoFechar}>
                                <Text style={styles.fechar}>✕</Text>
                            </Pressable>
                        </View>

                        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

                        {etapa === 'ESCOLHA' ? (
                            <>
                                <Text style={styles.info}>
                                    Cliente: {props.agendamento.emailCliente}
                                    {'\n'}Total: R$ {valorTotal.toFixed(2)}
                                </Text>
                                <Text style={styles.pergunta}>Deseja gerar o QR Code do Pix?</Text>
                                <Pressable
                                    style={styles.botaoPrimario}
                                    onPress={escolherPix}
                                    disabled={carregando}
                                >
                                    {carregando ? (
                                        <ActivityIndicator color="#0b0f14" />
                                    ) : (
                                        <Text style={styles.botaoPrimarioTexto}>
                                            Sim, gerar QR Code (Pix)
                                        </Text>
                                    )}
                                </Pressable>
                                <Pressable
                                    style={styles.botaoSecundario}
                                    onPress={confirmarDinheiro}
                                    disabled={carregando}
                                >
                                    <Text style={styles.botaoSecundarioTexto}>
                                        Não, foi pago em dinheiro
                                    </Text>
                                </Pressable>
                            </>
                        ) : null}

                        {etapa === 'QR' && dadosPix ? (
                            <>
                                <Text style={styles.info}>
                                    R$ {dadosPix.valor.toFixed(2)} para {dadosPix.nomeProfissional}
                                </Text>
                                <View
                                    style={[
                                        styles.qrFundo,
                                        { width: TAMANHO_QR, height: TAMANHO_QR },
                                    ]}
                                >
                                    {trechosQr.map((t, i) => (
                                        <View
                                            key={i}
                                            style={{
                                                position: 'absolute',
                                                left: (t.colInicio + margem) * tamanhoModulo,
                                                top: (t.linha + margem) * tamanhoModulo,
                                                width: (t.colFim - t.colInicio + 1) * tamanhoModulo,
                                                height: tamanhoModulo,
                                                backgroundColor: '#0a0e0d',
                                            }}
                                        />
                                    ))}
                                </View>
                                <Text style={styles.dica}>
                                    Peça para o cliente escanear com o app do banco dele.
                                </Text>
                                <Text style={styles.dica}>Ou toque e segure para copiar o código Pix:</Text>
                                <TextInput
                                    style={styles.campoPayload}
                                    value={dadosPix.payload}
                                    editable={false}
                                    multiline
                                    selectTextOnFocus
                                />
                                <Pressable
                                    style={styles.botaoPrimario}
                                    onPress={concluir}
                                    disabled={carregando}
                                >
                                    {carregando ? (
                                        <ActivityIndicator color="#0b0f14" />
                                    ) : (
                                        <Text style={styles.botaoPrimarioTexto}>
                                            Já recebi o pagamento — concluir
                                        </Text>
                                    )}
                                </Pressable>
                                <Pressable onPress={() => setEtapa('ESCOLHA')}>
                                    <Text style={styles.voltar}>← voltar</Text>
                                </Pressable>
                            </>
                        ) : null}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    fundo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    cartao: {
        backgroundColor: '#0a0a0a',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '85%',
    },
    conteudo: {
        padding: 20,
        gap: 12,
    },
    cabecalho: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titulo: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    fechar: {
        color: '#a1a1aa',
        fontSize: 18,
    },
    erro: {
        color: '#f87171',
        fontSize: 13,
    },
    info: {
        color: '#e4e4e7',
        fontSize: 14,
        lineHeight: 20,
    },
    pergunta: {
        color: '#a1a1aa',
        fontSize: 13,
    },
    botaoPrimario: {
        backgroundColor: '#22c55e',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    botaoPrimarioTexto: {
        color: '#0b0f14',
        fontWeight: '700',
        fontSize: 14,
    },
    campoPayload: {
        backgroundColor: '#111827',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 8,
        padding: 10,
        color: '#8fe6d9',
        fontSize: 11,
        maxHeight: 80,
    },
    botaoSecundario: {
        backgroundColor: '#27272a',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    botaoSecundarioTexto: {
        color: '#e4e4e7',
        fontWeight: '700',
        fontSize: 14,
    },
    qrFundo: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        alignSelf: 'center',
        overflow: 'hidden',
    },
    dica: {
        color: '#71717a',
        fontSize: 12,
        textAlign: 'center',
    },
    voltar: {
        color: '#a1a1aa',
        fontSize: 13,
        textAlign: 'center',
    },
})
