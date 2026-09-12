import { Alert, StyleSheet, Text, View, Image, Pressable } from 'react-native'
import { Agendamento } from '@neto-bastos/core'
import useAPI from '../../data/hooks/useAPI'
import React, { useEffect, useState } from 'react'
import AgendamentoItem from './AgendamentoItem'
import useUsuario from '@/src/data/hooks/useUsuario'
import useAgendamento from '@/src/data/hooks/useAgendamento'
import { useFocusEffect } from '@react-navigation/native'

interface UltimosAgendamentosProps {
    refreshToken?: number
    onRefreshComplete?: () => void
    aoNovoAgendamento?: () => void
}

export default function UltimosAgendamentos(props: UltimosAgendamentosProps) {
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>()
    const [cancelandoId, setCancelandoId] = useState<number | null>(null)
    const { httpGet, httpPatch } = useAPI()
    const { usuario } = useUsuario()
    const { versaoAgendamentos, solicitarAtualizacaoAgendamentos } = useAgendamento()

    useEffect(() => {
        carregarAgendamentos()
    }, [usuario, versaoAgendamentos])

    useFocusEffect(
        React.useCallback(() => {
            carregarAgendamentos()
        }, [usuario?.email])
    )

    useEffect(() => {
        if (props.refreshToken === undefined) return

        carregarAgendamentos().finally(() => {
            props.onRefreshComplete?.()
        })
    }, [props.refreshToken])

    async function carregarAgendamentos() {
        if (!usuario?.email) return
        const agendamentos = await httpGet(`agendamentos/${usuario?.email}`)
        setAgendamentos(agendamentos)
    }

    function confirmarCancelamento(id: number) {
        Alert.alert('Cancelar agendamento', 'Deseja realmente cancelar este agendamento?', [
            { text: 'Voltar', style: 'cancel' },
            {
                text: 'Cancelar agendamento',
                style: 'destructive',
                onPress: () => cancelarAgendamento(id),
            },
        ])
    }

    async function cancelarAgendamento(id: number) {
        try {
            setCancelandoId(id)
            await httpPatch(`agendamentos/${id}/status`, { status: 'CANCELADO' })
            await carregarAgendamentos()
            solicitarAtualizacaoAgendamentos()
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Nao foi possivel cancelar o agendamento.')
        } finally {
            setCancelandoId(null)
        }
    }

    function renderizarConteudo() {
        if (agendamentos && agendamentos?.length > 0) {
            return (
                <View>
                    <Text style={styles.subtitulo}>Aqui estão seus últimos agendamentos:</Text>
                    {agendamentos
                        ?.reverse()
                        .map((a: Agendamento) => (
                            <AgendamentoItem
                                agendamento={a}
                                key={a.id}
                                cancelando={cancelandoId === a.id}
                                onCancelar={
                                    a.status !== 'CANCELADO' ? () => confirmarCancelamento(a.id) : undefined
                                }
                            />
                        ))}
                </View>
            )
        } else {
            return (
                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.subtitulo}>Você ainda não tem agendamentos.</Text>
                    <Text style={styles.subtitulo}>Vamos agendar um novo serviço?</Text>
                    <Image
                        source={require('../../../assets/profissionais/profissional-1.jpg')}
                        style={styles.garotoPropaganda}
                    />
                </View>
            )
        }
    }

    return (
        <View style={styles.container}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} />
            <Text style={styles.titulo}>Fala, {usuario?.nome}!</Text>
            {props.aoNovoAgendamento ? (
                <Pressable style={styles.botaoNovoAgendamento} onPress={props.aoNovoAgendamento}>
                    <Text style={styles.textoBotaoNovoAgendamento}>Novo agendamento</Text>
                </Pressable>
            ) : null}
            {renderizarConteudo()}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    titulo: {
        fontSize: 30,
        color: '#e4e4e7',
        fontWeight: '800',
    },
    subtitulo: {
        fontSize: 16,
        textAlign: 'center',
        color: '#e4e4e7',
    },
    agendamentoItemContainer: {
        backgroundColor: '#09090b',
        borderRadius: 10,
        height: 144,
    },
    agendamentoItemConteudo: {
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 20,
    },
    agendamentoItemTexto: {
        fontSize: 16,
        color: 'white',
    },
    agendamentoTitulo: {
        fontSize: 40,
        color: 'white',
    },
    agendamentoHora: {
        fontSize: 25,
        color: 'white',
    },
    logo: {
        marginTop: 20,
        width: 200,
        height: 90,
        resizeMode: 'contain',
    },
    botaoNovoAgendamento: {
        backgroundColor: '#22c55e',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    textoBotaoNovoAgendamento: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    garotoPropaganda: {
        marginBottom: 20,
        marginTop: 20,
        width: 240,
        height: 240,
        resizeMode: 'contain',
    },
})
