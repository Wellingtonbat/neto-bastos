import { useState } from 'react'
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Profissional, Servico } from '@neto-bastos/core'
import useAgendamento from '../data/hooks/useAgendamento'
import ServicosInput from '../components/agendamento/ServicosInput'
import ProfissionalInput from '../components/agendamento/ProfissionalInput'
import Passos from '../components/agendamento/Passos'
import DataInput from '../components/agendamento/DataInput'

export default function Agendamentos({ navigation }: any) {
    const [permiteProximoPasso, setPermiteProximoPasso] = useState<boolean>(false)
    const [navegando, setNavegando] = useState(false)
    const {
        profissional,
        servicos,
        data,
        carregandoHorarios,
        selecionarProfissional,
        selecionarServicos,
        selecionarData,
        quantidadeDeSlots,
    } = useAgendamento()

    function profissionalMudou(profissional: Profissional) {
        selecionarProfissional(profissional)
        setPermiteProximoPasso(!!profissional)
    }

    function servicosMudou(servicos: Servico[]) {
        selecionarServicos(servicos)
        setPermiteProximoPasso(servicos.length > 0)
    }

    function dataMudou(data: Date | null) {
        selecionarData(data)
        if (!data) {
            setPermiteProximoPasso(false)
            return
        }

        const hora = data.getHours()
        const minuto = data.getMinutes()
        const horarioFoiSelecionado = !(hora === 0 && minuto === 0)
        const horaValida = hora >= 8 && hora <= 21 && minuto % 15 === 0
        setPermiteProximoPasso(horarioFoiSelecionado && horaValida)
    }

    async function irParaResumo() {
        setNavegando(true)
        navigation.navigate('Sumario')
        setNavegando(false)
    }

    return (
        <SafeAreaView style={{ ...styles.areaView }}>
            <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
                <View style={styles.container}>
                    <Text style={styles.titulo}>Agende seu horário</Text>
                    <Passos
                        labels={['Profissional', 'Serviços', 'Horário']}
                        permiteProximoPasso={permiteProximoPasso}
                        permiteProximoPassoMudou={setPermiteProximoPasso}
                        finalizar={irParaResumo}
                    >
                        <ProfissionalInput
                            profissional={profissional}
                            profissionalMudou={profissionalMudou}
                        />
                        <ServicosInput servicos={servicos} servicosMudou={servicosMudou} />
                        <DataInput
                            data={data}
                            dataMudou={dataMudou}
                            quantidadeDeSlots={quantidadeDeSlots()}
                            carregandoHorarios={carregandoHorarios}
                        />
                    </Passos>
                    {navegando ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color="#22c55e" size="large" />
                            <Text style={styles.loadingTexto}>Abrindo resumo...</Text>
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    areaView: {
        display: 'flex',
        flex: 1,
        gap: 12,
        width: '100%',
        backgroundColor: 'black',
    },
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        width: '100%',
        marginBottom: 20,
    },
    titulo: {
        color: 'white',
        fontSize: 30,
        fontWeight: '700',
        textAlign: 'center',
    },
    loadingContainer: {
        marginTop: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    loadingTexto: {
        color: '#e4e4e7',
        fontSize: 14,
    },
    imagemDeFundo: {
        flex: 1,
        resizeMode: 'cover',
        justifyContent: 'center',
    },
})
