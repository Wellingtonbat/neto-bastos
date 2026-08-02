import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import Perfil from '../components/perfil'
import useUsuario from '../data/hooks/useUsuario'
import GerenciarBarbeiros from '../components/perfil/GerenciarBarbeiros'

export default function Usuario({ navigation }: any) {
    const { usuario } = useUsuario()

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ flex: 1, paddingTop: 15 }}>
                    <Perfil navigation={navigation} />
                    {usuario?.role === 'DONO' ? <GerenciarBarbeiros /> : null}
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
        paddingBottom: 30,
    },
})
