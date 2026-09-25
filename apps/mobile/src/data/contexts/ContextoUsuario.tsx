'use client'
import { createContext, useCallback, useEffect, useState } from 'react'
import { Usuario } from '@neto-bastos/core'
import useLocalStorage from '../hooks/useLocalStorage'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { URL_BASE } from '../constants/ambiente'
import { navegarParaLogin } from '../navigation/navigationRef'

const CHAVE_PERMISSAO_PUSH_SOLICITADA = 'push-permissao-solicitada'

export interface DadosPerfil {
    nome: string
    telefone?: string
}

export interface ContextoUsuarioProps {
    carregando: boolean
    usuario: Usuario | null
    entrar: (usuario: Usuario) => Promise<void>
    sair: () => void
    limparSessao: () => void
    atualizarMeuPerfil: (dados: DadosPerfil) => Promise<void>
}

const ContextoUsuario = createContext<ContextoUsuarioProps>({} as any)

export function ProvedorUsuario({ children }: any) {
    const { get, set } = useLocalStorage()
    const [carregando, setCarregando] = useState(true)
    const [usuario, setUsuario] = useState<Usuario | null>(null)

    const isExpoGo =
        Constants.executionEnvironment === 'storeClient' ||
        Constants.appOwnership === 'expo'

    const solicitarPermissaoPushNoPrimeiroLogin = useCallback(async () => {
        if (Platform.OS === 'web') return

        const jaSolicitada = await get(CHAVE_PERMISSAO_PUSH_SOLICITADA)
        if (jaSolicitada) return

        try {
            const { status } = await Notifications.getPermissionsAsync()
            if (status !== 'granted') {
                await Notifications.requestPermissionsAsync()
            }
        } finally {
            await set(CHAVE_PERMISSAO_PUSH_SOLICITADA, true)
        }
    }, [get, set])

    const sincronizarPushToken = useCallback(async (usuarioAtual: Usuario | null) => {
        if (!usuarioAtual?.token) return
        if (Platform.OS === 'web') return
        if (isExpoGo) return

        try {
            const { status: statusAtual } = await Notifications.getPermissionsAsync()
            if (statusAtual !== 'granted') return

            const projectId =
                Constants.expoConfig?.extra?.eas?.projectId ??
                Constants.easConfig?.projectId

            const tokenExpo = (await Notifications.getExpoPushTokenAsync({ projectId })).data

            await fetch(`${URL_BASE}/auth/me/push-token`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${usuarioAtual.token}`,
                },
                body: JSON.stringify({ pushToken: tokenExpo }),
            })
        } catch {
            // Expo Go e ambientes sem suporte a push remoto nao devem bloquear login.
        }
    }, [isExpoGo])

    const carregarUsuario = useCallback(
        async function () {
            try {
                const usuarioLocal = await get('usuario')
                if (usuarioLocal) {
                    setUsuario(usuarioLocal)
                    await sincronizarPushToken(usuarioLocal)
                }
            } finally {
                setCarregando(false)
            }
        },
        [get, sincronizarPushToken]
    )

    async function entrar(usuario: Usuario) {
        setUsuario(usuario)
        await set('usuario', usuario)
        await solicitarPermissaoPushNoPrimeiroLogin()
        await sincronizarPushToken(usuario)
    }

    function sair() {
        setUsuario(null)
        set('usuario', null)
    }

    async function atualizarMeuPerfil(dados: DadosPerfil) {
        if (!usuario?.token) {
            throw new Error('Usuário não autenticado.')
        }

        const res = await fetch(`${URL_BASE}/auth/me`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${usuario.token}`,
            },
            body: JSON.stringify({ nome: dados.nome, telefone: dados.telefone }),
        })

        if (!res.ok) {
            let mensagem = 'Não foi possível atualizar o perfil.'
            try {
                const erro = await res.json()
                mensagem = Array.isArray(erro?.message) ? erro.message.join(', ') : (erro?.message ?? mensagem)
            } catch {
                // Mantem mensagem padrao quando resposta nao for JSON.
            }
            throw new Error(mensagem)
        }

        const atualizado = await res.json()
        setUsuario(atualizado)
        await set('usuario', atualizado)
    }

    // Usado quando uma chamada autenticada volta 401 (token expirado/
    // invalido): limpa a sessao e leva o usuario de volta pra tela de
    // login, diferente de sair() porque precisa navegar explicitamente --
    // aqui nao existe um gate reativo tipo o ForcarUsuario do frontend web.
    function limparSessao() {
        setUsuario(null)
        set('usuario', null)
        navegarParaLogin()
    }

    useEffect(() => {
        carregarUsuario()
    }, [carregarUsuario])

    return (
        <ContextoUsuario.Provider
            value={{
                carregando,
                usuario,
                entrar,
                sair,
                limparSessao,
                atualizarMeuPerfil,
            }}
        >
            {children}
        </ContextoUsuario.Provider>
    )
}

export default ContextoUsuario
