import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Inicio from './Inicio'
import Agendamento from './Agendamento'
import Usuario from './Usuario'
import Icone from '../components/shared/Icone'
import useUsuario from '../data/hooks/useUsuario'

type Aba = 'Inicio' | 'Agendamento' | 'Usuario'

export default function Principal({ navigation, route }: any) {
    const { usuario } = useUsuario()
    const insets = useSafeAreaInsets()
    const [abaAtiva, setAbaAtiva] = useState<Aba>(route?.params?.abaInicial ?? 'Inicio')

    useEffect(() => {
        if (route?.params?.abaInicial) {
            setAbaAtiva(route.params.abaInicial)
        }
    }, [route?.params?.abaInicial])

    const labelPerfil = usuario?.role === 'DONO' ? 'Adm' : 'Minha Agenda'

    function renderizarConteudo() {
        if (abaAtiva === 'Agendamento') return <Agendamento navigation={navigation} />
        if (abaAtiva === 'Usuario') return <Usuario navigation={navigation} />
        return <Inicio navigation={navigation} aoMudarAba={setAbaAtiva} />
    }

    function tab(aba: Aba, label: string, icone: string) {
        const focused = abaAtiva === aba
        return (
            <Pressable style={styles.tab} onPress={() => setAbaAtiva(aba)}>
                <Icone
                    nome={icone as any}
                    tamanho={22}
                    color={focused ? '#29A7EA' : '#9DA2AE'}
                />
                <Text style={{ ...styles.tabTexto, color: focused ? '#29A7EA' : '#9DA2AE' }}>
                    {label}
                </Text>
            </Pressable>
        )
    }

    return (
        <View style={styles.container}>
            <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
                {tab('Inicio', 'Início', 'home-outline')}
                {tab('Agendamento', 'Agendamento', 'calendar-outline')}
                {tab('Usuario', labelPerfil, 'person-outline')}
            </View>
            <View style={styles.conteudo}>{renderizarConteudo()}</View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    topBar: {
        flexDirection: 'row',
        backgroundColor: '#222',
        paddingBottom: 8,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    tabTexto: {
        fontSize: 10,
    },
    conteudo: {
        flex: 1,
    },
})
