import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import { useCallback, useState } from 'react'
import Perfil from '../components/perfil'
import useUsuario from '../data/hooks/useUsuario'
import PainelAdmin from '../components/perfil/PainelAdmin'

export default function Usuario({ navigation }: any) {
    const { usuario } = useUsuario()
    const [refreshing, setRefreshing] = useState(false)
    const [refreshToken, setRefreshToken] = useState(0)
    const ehAdmin = usuario?.role === 'DONO' || usuario?.role === 'BARBEIRO'

    const onRefresh = useCallback(() => {
        if (!ehAdmin) return
        setRefreshing(true)
        setRefreshToken((valor) => valor + 1)
    }, [ehAdmin])

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#22c55e"
                    />
                }
            >
                <View style={styles.content}>
                    <Perfil navigation={navigation} />
                    {ehAdmin ? (
                        <PainelAdmin
                            role={usuario?.role}
                            profissionalId={usuario?.profissionalId}
                            refreshToken={refreshToken}
                            onRefreshComplete={() => setRefreshing(false)}
                        />
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        flex: 1,
        gap: 12,
        width: '100%',
        backgroundColor: 'black',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 30,
    },
    content: {
        paddingTop: 8,
        minHeight: '100%',
    },
})
