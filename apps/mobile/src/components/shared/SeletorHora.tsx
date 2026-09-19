import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

interface SeletorHoraProps {
    valor: string
    aoAlterar: (valor: string) => void
    placeholder?: string
    temErro?: boolean
}

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

function partesDeHorario(valor: string): [string, string] {
    const [h, m] = (valor || '').split(':')
    return [HORAS.includes(h) ? h : '08', MINUTOS.includes(m) ? m : '00']
}

export default function SeletorHora(props: SeletorHoraProps) {
    const [aberto, setAberto] = useState(false)
    const [horaTemp, setHoraTemp] = useState('08')
    const [minutoTemp, setMinutoTemp] = useState('00')

    function abrir() {
        const [h, m] = partesDeHorario(props.valor)
        setHoraTemp(h)
        setMinutoTemp(m)
        setAberto(true)
    }

    function confirmar() {
        props.aoAlterar(`${horaTemp}:${minutoTemp}`)
        setAberto(false)
    }

    return (
        <>
            <Pressable style={[styles.campo, props.temErro ? styles.campoErro : null]} onPress={abrir}>
                <Text style={props.valor ? styles.texto : styles.textoPlaceholder}>
                    {props.valor || props.placeholder || 'HH:mm'}
                </Text>
            </Pressable>

            <Modal
                visible={aberto}
                transparent
                animationType="fade"
                onRequestClose={() => setAberto(false)}
            >
                <Pressable style={styles.fundo} onPress={() => setAberto(false)}>
                    <Pressable style={styles.cartao} onPress={() => {}}>
                        <Text style={styles.titulo}>Escolher horário</Text>
                        <View style={styles.colunas}>
                            <ScrollView style={styles.coluna} showsVerticalScrollIndicator={false}>
                                {HORAS.map((h) => (
                                    <Pressable
                                        key={h}
                                        style={[styles.item, h === horaTemp ? styles.itemAtivo : null]}
                                        onPress={() => setHoraTemp(h)}
                                    >
                                        <Text
                                            style={[styles.itemTexto, h === horaTemp ? styles.itemTextoAtivo : null]}
                                        >
                                            {h}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                            <Text style={styles.separador}>:</Text>
                            <ScrollView style={styles.coluna} showsVerticalScrollIndicator={false}>
                                {MINUTOS.map((m) => (
                                    <Pressable
                                        key={m}
                                        style={[styles.item, m === minutoTemp ? styles.itemAtivo : null]}
                                        onPress={() => setMinutoTemp(m)}
                                    >
                                        <Text
                                            style={[
                                                styles.itemTexto,
                                                m === minutoTemp ? styles.itemTextoAtivo : null,
                                            ]}
                                        >
                                            {m}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                        <View style={styles.acoes}>
                            <Pressable style={styles.botaoSecundario} onPress={() => setAberto(false)}>
                                <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={styles.botaoPrimario} onPress={confirmar}>
                                <Text style={styles.botaoPrimarioTexto}>Confirmar</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    )
}

const styles = StyleSheet.create({
    campo: {
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
    },
    campoErro: {
        borderColor: '#ef4444',
    },
    texto: {
        color: '#fff',
        fontSize: 14,
    },
    textoPlaceholder: {
        color: '#71717a',
        fontSize: 14,
    },
    fundo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartao: {
        backgroundColor: '#18181b',
        borderRadius: 12,
        padding: 16,
        width: 260,
    },
    titulo: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
    },
    colunas: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 180,
        gap: 4,
    },
    coluna: {
        width: 70,
    },
    separador: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    item: {
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    itemAtivo: {
        backgroundColor: '#22c55e',
    },
    itemTexto: {
        color: '#d4d4d8',
        fontSize: 15,
    },
    itemTextoAtivo: {
        color: '#0b0f14',
        fontWeight: '700',
    },
    acoes: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },
    botaoPrimario: {
        flex: 1,
        backgroundColor: '#22c55e',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
    },
    botaoPrimarioTexto: {
        color: '#0b0f14',
        fontWeight: '700',
    },
    botaoSecundario: {
        flex: 1,
        backgroundColor: '#27272a',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
    },
    botaoSecundarioTexto: {
        color: '#e4e4e7',
        fontWeight: '700',
    },
})
