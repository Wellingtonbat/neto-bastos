import { ImageBackground, RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import { useCallback, useState } from 'react'
import UltimosAgendamentos from '../components/agendamento/UltimosAgendamentos'

export default function Inicio() {
    const [refreshing, setRefreshing] = useState(false)
    const [refreshToken, setRefreshToken] = useState(0)

    const onRefresh = useCallback(() => {
        setRefreshing(true)
        setRefreshToken((valor) => valor + 1)
    }, [])

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
                    <View style={styles.view}>
                        <UltimosAgendamentos
                            refreshToken={refreshToken}
                            onRefreshComplete={() => setRefreshing(false)}
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
})
