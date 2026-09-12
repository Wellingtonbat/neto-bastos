import { TelefoneUtils } from '@neto-bastos/core'
import {
    StyleSheet,
    Text,
    TextInput,
    Pressable,
    View,
    ImageBackground,
    Image,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native'
import useUsuario from '../data/hooks/useUsuario'
import useAPI from '../data/hooks/useAPI'
import React, { useEffect, useState } from 'react'
import useFormUsuario from '../data/hooks/useFormUsuario'
import { AntDesign } from '@expo/vector-icons'
import * as Google from 'expo-auth-session/providers/google'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GOOGLE_ANDROID_CLIENT_ID } from '../data/constants/ambiente'

// Chamado tambem na raiz do app (src/App.tsx), o quanto antes possivel.

export default function Cadastro({ navigation }: any) {

    const { usuario, entrar } = useUsuario()
    const { httpPost } = useAPI()
    const {
        nome, setNome, email, setEmail, telefone, setTelefone, senha, setSenha, errors, cadastrar,
    } = useFormUsuario()
    const [carregando, setCarregando] = useState(false)
    const [carregandoGoogle, setCarregandoGoogle] = useState(false)
    const [mostrarSenha, setMostrarSenha] = useState(false)
    const insets = useSafeAreaInsets()

    const [requisicaoGoogle, respostaGoogle, iniciarLoginGoogle] = Google.useAuthRequest({
        androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    })

    useEffect(() => {
        if (usuario) {
            navigation?.replace('Principal')
        }
    }, [usuario])

    useEffect(() => {
        if (!respostaGoogle) return

        if (respostaGoogle.type !== 'success') {
            if (respostaGoogle.type === 'error') {
                Alert.alert(
                    'Erro ao entrar com Google',
                    respostaGoogle.error?.message ?? JSON.stringify(respostaGoogle.params ?? {}),
                )
            }
            return
        }

        const idToken = respostaGoogle.authentication?.idToken
        if (!idToken) {
            Alert.alert(
                'Erro ao entrar com Google',
                'Resposta sem idToken: ' + JSON.stringify(respostaGoogle.params ?? {}),
            )
            return
        }

        entrarComGoogle(idToken)
    }, [respostaGoogle])

    async function handleEntrar() {
        try {
            setCarregando(true)
            await cadastrar()
        } catch (erro: any) {
            Alert.alert('Erro ao entrar', erro?.message ?? 'Nao foi possivel concluir o login.')
        } finally {
            setCarregando(false)
        }
    }

    async function entrarComGoogle(idToken: string) {
        try {
            setCarregandoGoogle(true)
            const usuarioAutenticado = await httpPost('auth/google', { idToken })
            await entrar(usuarioAutenticado)
        } catch (erro: any) {
            Alert.alert('Erro ao entrar com Google', erro?.message ?? 'Nao foi possivel concluir o login.')
        } finally {
            setCarregandoGoogle(false)
        }
    }

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../../assets/inicio/fundo.png')}
                style={styles.imagemDeFundo}
            >
                <KeyboardAvoidingView
                    style={styles.keyboardContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollConteudo,
                            { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 },
                        ]}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.conteudo}>
                            <Image
                                source={require('../../assets/logo.png')}
                                style={styles.logo}
                            />
                            <Text style={styles.titulo}>🤘 DO CLASSICO AO RÚSTICO 🤘</Text>
                            <Text style={styles.descricao}>
                                Cabelo afiado, barba de lenhador e mãos de pedreiro!
                            </Text>
                            <View style={styles.formulario}>
                                <Text style={styles.label}>Nome</Text>
                                <TextInput
                                    style={[styles.input, errors.nome ? styles.inputError : null]}
                                    placeholder="Digite seu nome"
                                    placeholderTextColor="#666"
                                    value={nome}
                                    onChangeText={setNome}
                                    returnKeyType="next"
                                />
                                {errors.nome ? <Text style={styles.errorText}>{errors.nome}</Text> : null}

                                <Text style={styles.label}>E-mail</Text>
                                <TextInput
                                    style={[styles.input, errors.email ? styles.inputError : null]}
                                    placeholder="Digite seu e-mail"
                                    placeholderTextColor="#666"
                                    value={email.toLowerCase()}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                />
                                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

                                <Text style={styles.label}>Telefone</Text>
                                <TextInput
                                    style={[styles.input, errors.telefone ? styles.inputError : null]}
                                    placeholder="Digite seu telefone"
                                    placeholderTextColor="#666"
                                    value={TelefoneUtils.formatar(telefone)}
                                    onChangeText={(tel) => setTelefone(TelefoneUtils.desformatar(tel))}
                                    keyboardType="phone-pad"
                                    returnKeyType="done"
                                    onSubmitEditing={handleEntrar}
                                />
                                {errors.telefone ? (
                                    <Text style={styles.errorText}>{errors.telefone}</Text>
                                ) : null}

                                <Text style={styles.label}>Senha</Text>
                                <View style={styles.senhaContainer}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.inputSenha,
                                            errors.senha ? styles.inputError : null,
                                        ]}
                                        placeholder="Digite sua senha"
                                        placeholderTextColor="#666"
                                        value={senha}
                                        onChangeText={setSenha}
                                        secureTextEntry={!mostrarSenha}
                                        returnKeyType="done"
                                        onSubmitEditing={handleEntrar}
                                    />
                                    <Pressable
                                        style={styles.botaoMostrarSenha}
                                        onPress={() => setMostrarSenha((v) => !v)}
                                    >
                                        <Text style={styles.textoMostrarSenha}>
                                            {mostrarSenha ? 'ocultar' : 'mostrar'}
                                        </Text>
                                    </Pressable>
                                </View>
                                {errors.senha ? <Text style={styles.errorText}>{errors.senha}</Text> : null}
                                <Text style={styles.dicaSenha}>
                                    Primeiro acesso? A senha digitada agora será cadastrada para sua conta.
                                </Text>
                            </View>
                            <Pressable
                                style={[styles.button, carregando ? styles.buttonDesabilitado : null]}
                                onPress={handleEntrar}
                                disabled={carregando}
                            >
                                <Text style={styles.buttonText}>{carregando ? 'Entrando...' : 'Entrar'}</Text>
                            </Pressable>

                            {GOOGLE_ANDROID_CLIENT_ID ? (
                                <Pressable
                                    style={[
                                        styles.buttonGoogle,
                                        !requisicaoGoogle || carregandoGoogle ? styles.buttonDesabilitado : null,
                                    ]}
                                    onPress={() => iniciarLoginGoogle()}
                                    disabled={!requisicaoGoogle || carregandoGoogle}
                                >
                                    {carregandoGoogle ? (
                                        <ActivityIndicator color="#1f2937" size="small" />
                                    ) : (
                                        <AntDesign name="google" size={22} color="#1f2937" />
                                    )}
                                </Pressable>
                            ) : null}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardContainer: {
        flex: 1,
    },
    scrollConteudo: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    label: {
        color: '#fff',
        alignSelf: 'flex-start',
        marginBottom: 4,
        marginLeft: 10,
        fontSize: 14,
    },
    input: {
        width: '100%',
        minWidth: 280,
        height: 36,
        backgroundColor: '#1e1e1e',
        borderRadius: 5,
        paddingHorizontal: 10,
        color: '#fff',
        marginBottom: 12,
    },
    inputError: {
        borderColor: 'red',
        borderWidth: 1,
    },
    errorText: {
        color: 'red',
        marginBottom: 20,
        marginLeft: 10,
        alignSelf: 'flex-start',
    },
    senhaContainer: {
        width: '100%',
        justifyContent: 'center',
    },
    inputSenha: {
        paddingRight: 70,
    },
    botaoMostrarSenha: {
        position: 'absolute',
        right: 10,
        top: 10,
    },
    textoMostrarSenha: {
        color: '#9ca3af',
        fontSize: 12,
    },
    dicaSenha: {
        color: '#9ca3af',
        fontSize: 11,
        marginTop: -6,
        marginBottom: 12,
        marginLeft: 10,
        alignSelf: 'flex-start',
    },
    button: {
        width: '40%',
        height: 38,
        backgroundColor: '#22c55e',
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDesabilitado: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    buttonGoogle: {
        marginTop: 14,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    imagemDeFundo: {
        flex: 1,
        resizeMode: 'cover',
        justifyContent: 'center',
    },
    formulario: {
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    logo: {
        marginTop: 6,
        marginBottom: 8,
        width: 120,
        height: 108,
        resizeMode: 'contain',
    },
    conteudo: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    titulo: {
        fontSize: 15,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 6,
    },
    descricao: {
        fontSize: 13,
        color: 'white',
        textAlign: 'center',
        marginBottom: 10,
        marginHorizontal: 20,
    },
})
