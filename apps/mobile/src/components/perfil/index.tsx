import { TelefoneUtils } from '@neto-bastos/core'
import { StyleSheet, View, Image, Text, Pressable } from 'react-native'
import useUsuario from '@/src/data/hooks/useUsuario'
import React, { useState } from 'react'

export default function Perfil({ navigation }: any) {
    const { usuario, sair } = useUsuario()
    const [menuAberto, setMenuAberto] = useState(false)

    function handleSair() {
        sair()
        setMenuAberto(false)
        navigation.reset({
            index: 0,
            routes: [{ name: 'Cadastro' }],
        })
    }

    return (
        <View style={styles.container}>
            <View style={styles.topo}>
                <Pressable
                    style={styles.avatarBotao}
                    onPress={() => setMenuAberto((aberto) => !aberto)}
                >
                    <Image source={require('../../../assets/avatar.png')} style={styles.avatar} />
                </Pressable>
            </View>

            {menuAberto ? (
                <View style={styles.cardUsuario}>
                    <Text style={styles.destaque}>Ola, {usuario?.nome}!</Text>
                    <Text style={styles.texto}>E-mail: {usuario?.email?.toLowerCase() ?? '-'}</Text>
                    <Text style={styles.texto}>
                        Telefone: {usuario?.telefone ? TelefoneUtils.formatar(usuario.telefone) : '-'}
                    </Text>
                    <Pressable style={styles.botao} onPress={handleSair}>
                        <Text style={styles.textoBotao}>SAIR</Text>
                    </Pressable>
                </View>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        zIndex: 5,
    },
    topo: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    avatarBotao: {
        width: 52,
        height: 52,
        borderRadius: 26,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#3f3f46',
        backgroundColor: '#18181b',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 26,
    },
    destaque: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    texto: {
        marginTop: 4,
        fontSize: 14,
        fontWeight: '400',
        color: '#A9A9A9',
    },
    cardUsuario: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 12,
        padding: 12,
        backgroundColor: '#111827',
    },
    botao: {
        marginTop: 12,
        width: 110,
        height: 40,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    textoBotao: {
        fontSize: 14,
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
})
