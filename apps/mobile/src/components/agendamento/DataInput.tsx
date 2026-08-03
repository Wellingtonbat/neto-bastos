import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import HorariosInput from './HorariosInput'
import DiaInput from './DiaInput'

export interface DataInputProps {
    data: Date | null
    quantidadeDeSlots: number
    dataMudou: (data: Date | null) => void
    carregandoHorarios?: boolean
}

export default function DataInput(props: DataInputProps) {
    const { data, quantidadeDeSlots, dataMudou, carregandoHorarios } = props

    return (
        <View>
            <DiaInput data={data} dataMudou={dataMudou} />
            {data ? (
                <>
                    {carregandoHorarios ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#22c55e" />
                            <Text style={styles.loadingTexto}>Carregando horários...</Text>
                        </View>
                    ) : null}
                    <HorariosInput
                        data={data}
                        qtdeHorarios={quantidadeDeSlots}
                        dataMudou={dataMudou}
                    />
                </>
            ) : (
                <Text style={styles.info}>Selecione um dia para liberar os horários.</Text>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    info: {
        color: '#a1a1aa',
        textAlign: 'center',
        marginBottom: 12,
        marginTop: 4,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 6,
    },
    loadingTexto: {
        color: '#a1a1aa',
        fontSize: 12,
    },
})
