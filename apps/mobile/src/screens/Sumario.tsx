import { StyleSheet, Text, Pressable, View } from 'react-native'
import { DataUtils } from '@neto-bastos/core'
import useAgendamento from '../data/hooks/useAgendamento'
import { ActivityIndicator, Alert } from 'react-native'
import { useState } from 'react'

export default function Sumario({ navigation }: any) {
    const { data, profissional, servicos, duracaoTotal, precoTotal, agendar, carregandoAgendamento } = useAgendamento()
    const [salvando, setSalvando] = useState(false)

    const resumoCompleto = !!profissional && servicos.length > 0 && !!data

    const valorTotal = precoTotal().toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    })

    async function finalizarAgendamento() {
        try {
            setSalvando(true)
            await agendar()
            navigation.navigate('Inicio')
        } catch (e: any) {
            Alert.alert('Erro ao salvar agendamento', e?.message ?? 'Nao foi possivel concluir.')
        } finally {
            setSalvando(false)
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.titulo}>Resumo do Agendamento</Text>
                <Text style={styles.subtitulo}>Será um prazer atendê-lo!</Text>

                <Text style={styles.label}>PROFISSIONAL</Text>
                <Text style={styles.valor}>{profissional?.nome ?? 'Nao selecionado'}</Text>

                <Text style={styles.label}>SERVIÇOS</Text>
                {servicos.map((s, index) => (
                    <Text key={index} style={styles.servico}>
                        {index + 1}. {s.nome}
                    </Text>
                ))}
                {servicos.length === 0 ? <Text style={styles.servico}>Nenhum servico selecionado</Text> : null}

                <Text style={styles.label}>DURAÇÃO</Text>
                <Text style={styles.valor}>{duracaoTotal()}</Text>

                <Text style={styles.label}>HORÁRIO</Text>
                <Text style={styles.valor}>{data ? DataUtils.formatarData(data) : 'Nao selecionado'}</Text>

                <Text style={styles.valorTotalLabel}>VALOR TOTAL</Text>
                <Text style={styles.valorTotal}>{valorTotal}</Text>

                <Pressable
                    style={[styles.botao, (!resumoCompleto || salvando || carregandoAgendamento) ? styles.botaoDesabilitado : null]}
                    onPress={finalizarAgendamento}
                    disabled={!resumoCompleto || salvando || carregandoAgendamento}
                >
                    {salvando || carregandoAgendamento ? (
                        <View style={styles.loadingInline}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={styles.textoBotao}>Salvando...</Text>
                        </View>
                    ) : (
                        <Text style={styles.textoBotao}>Finalizar Agendamento</Text>
                    )}
                </Pressable>
            </View>
        </View>
    )
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        gap: 5,
        backgroundColor: '#1E1E1E',
        padding: 20,
        borderRadius: 10,
        width: '90%',
        alignItems: 'center',
    },
    titulo: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitulo: {
        color: '#FFFFFF',
        fontSize: 14,
        marginBottom: 20,
    },
    label: {
        color: '#AAAAAA',
        fontSize: 12,
        alignSelf: 'flex-start',
        marginTop: 10,
    },
    valor: {
        color: '#FFFFFF',
        fontSize: 16,
        alignSelf: 'flex-start',
    },
    servico: {
        color: '#FFFFFF',
        fontSize: 16,
        alignSelf: 'flex-start',
        marginTop: 5,
    },
    valorTotalLabel: {
        color: '#AAAAAA',
        fontSize: 12,
        alignSelf: 'flex-start',
        marginTop: 20,
    },
    valorTotal: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
        alignSelf: 'flex-start',
    },
    botao: {
        backgroundColor: '#22c55e',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 5,
        marginTop: 30,
    },
    botaoDesabilitado: {
        opacity: 0.6,
    },
    textoBotao: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
})
