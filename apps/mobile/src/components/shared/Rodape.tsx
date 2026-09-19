import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import Constants from 'expo-constants'
import * as Updates from 'expo-updates'
import Icone from './Icone'

const VERSAO = Constants.expoConfig?.version ?? '1.0.0'

export default function Rodape() {
    const [verificando, setVerificando] = useState(false)

    async function atualizar() {
        if (!Updates.isEnabled) {
            Alert.alert('Atualização indisponível', 'Verificação de atualização não está disponível neste ambiente.')
            return
        }
        try {
            setVerificando(true)
            const resultado = await Updates.checkForUpdateAsync()
            if (!resultado.isAvailable) {
                Alert.alert('Tudo certo', 'O app já está na versão mais recente.')
                return
            }
            await Updates.fetchUpdateAsync()
            await Updates.reloadAsync()
        } catch (e: any) {
            Alert.alert('Erro ao atualizar', e?.message ?? 'Não foi possível verificar atualizações agora.')
        } finally {
            setVerificando(false)
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.texto}>
                v{VERSAO} · © 2026 Well Tech
            </Text>
            <Pressable style={styles.botao} onPress={atualizar} disabled={verificando} hitSlop={8}>
                {verificando ? (
                    <ActivityIndicator color="#6B7280" size="small" />
                ) : (
                    <>
                        <Icone nome="refresh-outline" tamanho={12} color="#6B7280" />
                        <Text style={styles.botaoTexto}>Atualizar</Text>
                    </>
                )}
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 6,
        backgroundColor: '#111',
    },
    texto: {
        fontSize: 10,
        color: '#6B7280',
    },
    botao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    botaoTexto: {
        fontSize: 10,
        color: '#6B7280',
        textDecorationLine: 'underline',
    },
})
