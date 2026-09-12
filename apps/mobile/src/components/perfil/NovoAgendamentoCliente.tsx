import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Profissional, Servico } from '@neto-bastos/core'
import useAgendamento from '@/src/data/hooks/useAgendamento'
import useAPI from '@/src/data/hooks/useAPI'
import Passos from '../agendamento/Passos'
import ClienteInput, { ClienteAdmin } from '../agendamento/ClienteInput'
import ProfissionalInput from '../agendamento/ProfissionalInput'
import ServicosInput from '../agendamento/ServicosInput'
import DataInput from '../agendamento/DataInput'

interface NovoAgendamentoClienteProps {
    profissionais: Profissional[]
    servicos: Servico[]
    aoAgendarComSucesso: () => void
}

export default function NovoAgendamentoCliente(props: NovoAgendamentoClienteProps) {
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
        agendar,
    } = useAgendamento()

    const [clientes, setClientes] = useState<ClienteAdmin[]>([])
    const [carregandoClientes, setCarregandoClientes] = useState(false)
    const [clienteSelecionado, setClienteSelecionado] = useState<ClienteAdmin | null>(null)
    const [permiteProximoPasso, setPermiteProximoPasso] = useState(false)
    const [avancarAutomaticamente, setAvancarAutomaticamente] = useState(0)
    const [reiniciarPassos, setReiniciarPassos] = useState(0)
    const [agendando, setAgendando] = useState(false)

    async function carregarClientes() {
        try {
            setCarregandoClientes(true)
            const data = await httpGet('auth/clientes')
            setClientes(data ?? [])
        } catch {
            setClientes([])
        } finally {
            setCarregandoClientes(false)
        }
    }

    function clienteMudou(cliente: ClienteAdmin) {
        setClienteSelecionado(cliente)
        setAvancarAutomaticamente((valor) => valor + 1)
    }

    function profissionalMudou(profissional: Profissional) {
        selecionarProfissional(profissional)
        setPermiteProximoPasso(!!profissional)
        setAvancarAutomaticamente((valor) => valor + 1)
    }

    function servicosMudou(servicos: Servico[]) {
        selecionarServicos(servicos)
        setPermiteProximoPasso(servicos.length > 0)
        setAvancarAutomaticamente((valor) => valor + 1)
    }

    function dataMudou(data: Date | null) {
        selecionarData(data)
        if (!data) {
            setPermiteProximoPasso(false)
            return
        }
        const horaValida = data.getHours() >= 8 && data.getHours() <= 21
        setPermiteProximoPasso(horaValida)
    }

    async function confirmarAgendamento() {
        if (!clienteSelecionado) {
            Alert.alert('Selecione um cliente', 'Escolha um cliente para continuar.')
            return
        }

        try {
            setAgendando(true)
            await agendar(clienteSelecionado.email)
            Alert.alert('Sucesso', 'Agendamento criado com sucesso.')
            setClienteSelecionado(null)
            setPermiteProximoPasso(false)
            setReiniciarPassos((valor) => valor + 1)
            props.aoAgendarComSucesso()
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel criar o agendamento.')
        } finally {
            setAgendando(false)
        }
    }

    useEffect(() => {
        carregarClientes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <View style={styles.container}>
            {carregandoClientes ? <ActivityIndicator color="#22c55e" /> : null}
            <Passos
                labels={['Cliente', 'Profissional', 'Serviço', 'Horário']}
                permiteProximoPasso={permiteProximoPasso}
                permiteProximoPassoMudou={setPermiteProximoPasso}
                avancarAutomaticamente={avancarAutomaticamente}
                reiniciar={reiniciarPassos}
                finalizar={confirmarAgendamento}
            >
                <ClienteInput
                    clientes={clientes}
                    cliente={clienteSelecionado}
                    clienteMudou={clienteMudou}
                />
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
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
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
})
