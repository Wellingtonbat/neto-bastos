import { useEffect, useState } from 'react'
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Profissional, Servico } from '@neto-bastos/core'
import useAgendamento from '../data/hooks/useAgendamento'
import ServicosInput from '../components/agendamento/ServicosInput'
import ProfissionalInput from '../components/agendamento/ProfissionalInput'
import Passos from '../components/agendamento/Passos'
import DataInput from '../components/agendamento/DataInput'
import useAPI from '../data/hooks/useAPI'

export default function Agendamentos({ navigation }: any) {
    const [permiteProximoPasso, setPermiteProximoPasso] = useState<boolean>(false)
    const [navegando, setNavegando] = useState(false)
    const [profissionaisDisponiveis, setProfissionaisDisponiveis] = useState<Profissional[]>([])
    const [servicosDisponiveis, setServicosDisponiveis] = useState<Servico[]>([])
    const [carregandoDados, setCarregandoDados] = useState(true)
    const [erroCarregamento, setErroCarregamento] = useState('')
    const { httpGet } = useAPI()
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

    useEffect(() => {
        let ativo = true

        async function carregarDados() {
            try {
                setCarregandoDados(true)
                setErroCarregamento('')
                const [profissionaisApi, servicosApi] = await Promise.all([
                    httpGet('profissional'),
                    httpGet('servico'),
                ])

                if (!ativo) return
                setProfissionaisDisponiveis(profissionaisApi ?? [])
                setServicosDisponiveis(servicosApi ?? [])
            } catch (e: any) {
                if (!ativo) return
                setErroCarregamento(e?.message ?? 'Nao foi possivel carregar barbeiros e servicos.')
            } finally {
                if (!ativo) return
                setCarregandoDados(false)
            }
        }

        carregarDados()

        return () => {
            ativo = false
        }
    }, [httpGet])

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
                        {carregandoDados ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color="#22c55e" size="small" />
                                <Text style={styles.loadingTexto}>Carregando barbeiros...</Text>
                            </View>
                        ) : null}
                        {erroCarregamento ? <Text style={styles.erroTexto}>{erroCarregamento}</Text> : null}
                        <ProfissionalInput
                            profissionais={profissionaisDisponiveis}
                            profissional={profissional}
                            profissionalMudou={profissionalMudou}
                        />
                        <ServicosInput
                            todosServicos={servicosDisponiveis}
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
    erroTexto: {
        color: '#f87171',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    imagemDeFundo: {
        flex: 1,
        resizeMode: 'cover',
        justifyContent: 'center',
    },
})
