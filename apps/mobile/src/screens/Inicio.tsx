import { ImageBackground, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useCallback, useState } from 'react'
import UltimosAgendamentos from '../components/agendamento/UltimosAgendamentos'
import useUsuario from '../data/hooks/useUsuario'

export default function Inicio({ navigation, aoMudarAba }: any) {
    const { usuario, sair } = useUsuario()
    const [refreshing, setRefreshing] = useState(false)
    const [refreshToken, setRefreshToken] = useState(0)

    const onRefresh = useCallback(() => {
        setRefreshing(true)
        setRefreshToken((valor) => valor + 1)
    }, [])

    function sairDaConta() {
        sair()
        navigation.reset({
            index: 0,
            routes: [{ name: 'Cadastro' }],
        })
    }

    return (
        <ImageBackground
            source={require('../../assets/inicio/fundo.png')}
            style={styles.imagemDeFundo}
        >
            <SafeAreaView style={styles.areaView}>
                <ScrollView
                    contentContainerStyle={styles.scrollViewConteudo}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#22c55e"
                        />
                    }
                >
                    {usuario?.role === 'CLIENTE' ? (
                        <Pressable style={styles.botaoSair} onPress={sairDaConta}>
                            <Text style={styles.textoSair}>Sair</Text>
                        </Pressable>
                    ) : null}
                    <View style={styles.view}>
                        <UltimosAgendamentos
                            refreshToken={refreshToken}
                            onRefreshComplete={() => setRefreshing(false)}
                            aoNovoAgendamento={() => aoMudarAba?.('Agendamento')}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    areaView: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent',
    },
    scrollViewConteudo: {
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    view: {
        width: '100%',
        justifyContent: 'flex-start',
    },
    imagemDeFundo: {
        flex: 1,
        resizeMode: 'cover',
        width: '100%',
        height: '100%',
    },
    botaoSair: {
        alignSelf: 'flex-end',
        marginTop: 8,
        marginRight: 16,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    textoSair: {
        color: '#e4e4e7',
        fontSize: 13,
        textDecorationLine: 'underline',
    },
})
