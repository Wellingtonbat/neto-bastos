import { StyleSheet, Text, Pressable, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'

export interface PassosProps {
    children: any
    labels: string[]
    permiteProximoPasso: boolean
    permiteProximoPassoMudou(valor: boolean): void
    finalizar(): void
    avancarAutomaticamente?: number
    reiniciar?: number
}

export default function Passos(props: PassosProps) {
    const [passoAtual, setPassoAtual] = useState(0)
    const ultimoSinalAvanco = useRef(props.avancarAutomaticamente)
    const ultimoSinalReinicio = useRef(props.reiniciar)

    useEffect(() => {
        if (props.avancarAutomaticamente === undefined) return
        if (ultimoSinalAvanco.current === props.avancarAutomaticamente) return
        ultimoSinalAvanco.current = props.avancarAutomaticamente

        setPassoAtual((atual) => Math.min(atual + 1, props.labels.length - 1))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.avancarAutomaticamente])

    useEffect(() => {
        if (props.reiniciar === undefined) return
        if (ultimoSinalReinicio.current === props.reiniciar) return
        ultimoSinalReinicio.current = props.reiniciar

        setPassoAtual(0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.reiniciar])

    function passoAnterior() {
        if (passoAtual <= 0) return
        setPassoAtual(passoAtual - 1)
        props.permiteProximoPassoMudou(true)
    }

    function renderizarPassos() {
        return (
            <View style={styles.passoContainer}>
                {props.labels.map((label, i) => (
                    <View key={label} style={styles.passo}>
                        <View
                            style={{
                                ...styles.passoNumero,
                                backgroundColor: i <= passoAtual ? '#e4e4e7' : '#71717a',
                            }}
                        >
                            <Text>{i + 1}</Text>
                        </View>
                        <Text
                            style={{
                                ...styles.passoTexto,
                                color: i <= passoAtual ? 'white' : '#3f3f46',
                            }}
                        >
                            {label}
                        </Text>
                    </View>
                ))}
            </View>
        )
    }

    function renderizarBotao(texto: string, habilitar: boolean, onPress: () => void) {
        return (
            <View style={styles.botaoContainer}>
                <Pressable
                    disabled={!habilitar}
                    onPress={onPress}
                    style={{
                        borderRadius: 5,
                    }}
                >
                    <View
                        style={{
                            ...styles.botao,
                            backgroundColor: habilitar ? '#27272a' : '#18181b',
                        }}
                    >
                        <Text style={styles.botaoTexto}>{texto}</Text>
                    </View>
                </Pressable>
            </View>
        )
    }

    return (
        <View>
            {renderizarPassos()}
            <View>{props.children?.[passoAtual]}</View>
            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                {renderizarBotao('Anterior', passoAtual > 0, passoAnterior)}
                {passoAtual === props.labels.length - 1
                    ? renderizarBotao('Próximo', props.permiteProximoPasso, props.finalizar)
                    : null}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    passoContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    passoNumero: {
        borderRadius: 999,
        width: 20,
        height: 20,
        color: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    passoTexto: {
        fontSize: 18,
    },
    passo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    botaoContainer: {
        marginTop: 10,
        justifyContent: 'center',
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    botao: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 5,
    },
    botaoTexto: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '700',
    },
})
