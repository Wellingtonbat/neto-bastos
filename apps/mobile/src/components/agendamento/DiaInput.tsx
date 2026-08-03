import { DataUtils } from '@neto-bastos/core'
import { StyleSheet, Text, Pressable, View } from 'react-native'

export interface DiaInputProps {
    data: Date | null
    dataMudou(data: Date | null): void
}

export default function DiaInput(props: DiaInputProps) {
    function renderizarDia(data: Date) {
        if (data.getDay() === 0) {
            data.setDate(data.getDate() + 1)
        }

        const selecionado =
            !!props.data &&
            data.getDate() === props.data.getDate() &&
            data.getMonth() === props.data.getMonth() &&
            data.getFullYear() === props.data.getFullYear()

        const selecionarDia = () => {
            const diaSelecionado = new Date(data)
            diaSelecionado.setHours(0, 0, 0, 0)
            props.dataMudou(diaSelecionado)
        }

        return (
            <View
                key={data.getTime()}
                style={{ ...styles.card, backgroundColor: selecionado ? '#fbbf24' : '#18181b' }}
            >
                <Pressable onPress={selecionarDia}>
                    <View style={{ alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text
                                style={{
                                    ...styles.mesNumero,
                                    color: selecionado ? 'black' : '#e4e4e7',
                                }}
                            >
                                {data.getDate()}
                            </Text>
                            <Text
                                style={{
                                    ...styles.mesTexto,
                                    color: selecionado ? 'black' : '#e4e4e7',
                                }}
                            >
                                {data.toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3)}
                            </Text>
                        </View>
                        <Text
                            style={{
                                color: selecionado ? 'black' : '#e4e4e7',
                                textTransform: 'uppercase',
                            }}
                        >
                            {data.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                        </Text>
                    </View>
                </Pressable>
            </View>
        )
    }

    return (
        <View style={{ marginTop: 30, alignItems: 'center' }}>
            <Text style={{ color: '#e4e4e7', fontSize: 18, fontWeight: 'bold' }}>
                Dias Disponíveis
            </Text>
            <View style={styles.diaContainer}>
                {Array.from({ length: 7 })
                    .map((_, i) => new Date(DataUtils.hoje().getTime() + 86400000 * i))
                    .filter((date) => date.getDay() !== 0)
                    .map((date) => renderizarDia(date))}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    diaContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        marginVertical: 16,
        flexWrap: 'wrap',
        borderRadius: 10,
        overflow: 'hidden',
    },
    mesNumero: { fontSize: 20, fontWeight: '800', color: '#e4e4e7' },
    mesTexto: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        color: '#e4e4e7',
    },
    card: {
        flex: 1,
        paddingVertical: 10,
    },
})
