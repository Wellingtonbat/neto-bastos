import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

interface SeletorDataProps {
    valor: string
    aoAlterar: (valor: string) => void
    label?: string
    ativo?: boolean
}

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function dataYYYYMMDD(data: Date) {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
}

function celulasDoMes(ano: number, mes: number): (Date | null)[] {
    const primeiroDia = new Date(ano, mes, 1)
    const ultimoDia = new Date(ano, mes + 1, 0)
    const celulas: (Date | null)[] = []
    for (let i = 0; i < primeiroDia.getDay(); i++) celulas.push(null)
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) celulas.push(new Date(ano, mes, dia))
    return celulas
}

export default function SeletorData(props: SeletorDataProps) {
    const [aberto, setAberto] = useState(false)
    const [mesVisivel, setMesVisivel] = useState(new Date().getMonth())
    const [anoVisivel, setAnoVisivel] = useState(new Date().getFullYear())

    function abrir() {
        const referencia = props.valor ? new Date(`${props.valor}T00:00:00`) : new Date()
        setMesVisivel(referencia.getMonth())
        setAnoVisivel(referencia.getFullYear())
        setAberto(true)
    }

    function mudarMes(delta: number) {
        const data = new Date(anoVisivel, mesVisivel + delta, 1)
        setMesVisivel(data.getMonth())
        setAnoVisivel(data.getFullYear())
    }

    function selecionarDia(dia: Date) {
        props.aoAlterar(dataYYYYMMDD(dia))
        setAberto(false)
    }

    const celulas = celulasDoMes(anoVisivel, mesVisivel)
    const hojeISO = dataYYYYMMDD(new Date())

    return (
        <>
            <Pressable style={[styles.gatilho, props.ativo ? styles.gatilhoAtivo : null]} onPress={abrir}>
                <Text style={[styles.gatilhoTexto, props.ativo ? styles.gatilhoTextoAtivo : null]}>
                    {props.label ?? 'Escolher data'}
                </Text>
            </Pressable>

            <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
                <Pressable style={styles.fundo} onPress={() => setAberto(false)}>
                    <Pressable style={styles.cartao} onPress={() => {}}>
                        <View style={styles.cabecalho}>
                            <Pressable onPress={() => mudarMes(-1)} hitSlop={8}>
                                <Text style={styles.seta}>‹</Text>
                            </Pressable>
                            <Text style={styles.tituloMes}>
                                {MESES[mesVisivel]} {anoVisivel}
                            </Text>
                            <Pressable onPress={() => mudarMes(1)} hitSlop={8}>
                                <Text style={styles.seta}>›</Text>
                            </Pressable>
                        </View>

                        <View style={styles.linhaSemana}>
                            {DIAS_SEMANA.map((d, i) => (
                                <Text key={i} style={styles.diaSemanaTexto}>{d}</Text>
                            ))}
                        </View>

                        <View style={styles.grid}>
                            {celulas.map((dia, indice) => {
                                if (!dia) return <View key={indice} style={styles.celula} />
                                const iso = dataYYYYMMDD(dia)
                                const selecionado = iso === props.valor
                                const hoje = iso === hojeISO
                                return (
                                    <Pressable
                                        key={indice}
                                        style={[styles.celula, styles.diaCelula, selecionado ? styles.diaSelecionado : null]}
                                        onPress={() => selecionarDia(dia)}
                                    >
                                        <Text
                                            style={[
                                                styles.diaTexto,
                                                hoje ? styles.diaTextoHoje : null,
                                                selecionado ? styles.diaTextoSelecionado : null,
                                            ]}
                                        >
                                            {dia.getDate()}
                                        </Text>
                                    </Pressable>
                                )
                            })}
                        </View>

                        <Pressable style={styles.botaoCancelar} onPress={() => setAberto(false)}>
                            <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    )
}

const styles = StyleSheet.create({
    gatilho: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginRight: 8,
    },
    gatilhoAtivo: {
        backgroundColor: '#22c55e',
        borderColor: '#22c55e',
    },
    gatilhoTexto: {
        color: '#e4e4e7',
        fontSize: 12,
    },
    gatilhoTextoAtivo: {
        color: '#0b0f14',
        fontWeight: '700',
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
        width: 300,
    },
    cabecalho: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    seta: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        paddingHorizontal: 10,
    },
    tituloMes: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    linhaSemana: {
        flexDirection: 'row',
    },
    diaSemanaTexto: {
        flex: 1,
        textAlign: 'center',
        color: '#71717a',
        fontSize: 11,
        marginBottom: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    celula: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    diaCelula: {
        borderRadius: 8,
    },
    diaSelecionado: {
        backgroundColor: '#22c55e',
    },
    diaTexto: {
        color: '#e4e4e7',
        fontSize: 13,
    },
    diaTextoHoje: {
        color: '#22c55e',
        fontWeight: '700',
    },
    diaTextoSelecionado: {
        color: '#0b0f14',
        fontWeight: '700',
    },
    botaoCancelar: {
        marginTop: 12,
        alignItems: 'center',
    },
    botaoCancelarTexto: {
        color: '#a1a1aa',
        fontSize: 13,
    },
})
