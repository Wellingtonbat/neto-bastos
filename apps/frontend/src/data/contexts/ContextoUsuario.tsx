'use client'
import { createContext, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Usuario } from '@neto-bastos/core'
import useLocalStorage from '../hooks/useLocalStorage'

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export interface ContextoUsuarioProps {
    carregando: boolean
    usuario: Usuario | null
    entrar: (usuario: Usuario) => Promise<void>
    entrarComGoogle: (idToken: string) => Promise<void>
    sair: () => void
}

const ContextoUsuario = createContext<ContextoUsuarioProps>({} as any)

export function ProvedorUsuario({ children }: any) {
    const { get, set, remove } = useLocalStorage()
    const router = useRouter()
    const [carregando, setCarregando] = useState(true)
    const [usuario, setUsuario] = useState<Usuario | null>(null)

    const carregarUsuario = useCallback(
        async function () {
            try {
                const usuarioLocal = get('usuario')
                if (!usuarioLocal?.token) {
                    setUsuario(null)
                    return
                }

                const res = await fetch(`${URL_BASE}/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${usuarioLocal.token}`,
                    },
                })

                if (!res.ok) {
                    setUsuario(null)
                    remove('usuario')
                    return
                }

                const autenticado = await res.json()
                setUsuario(autenticado)
                set('usuario', autenticado)
            } finally {
                setCarregando(false)
            }
        },
        [get, set, remove]
    )

    async function entrar(usuario: Usuario) {
        const res = await fetch(`${URL_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nome: usuario.nome,
                email: usuario.email,
                telefone: usuario.telefone,
            }),
        })

        if (!res.ok) {
            throw new Error('Não foi possível autenticar o usuário.')
        }

        const autenticado = await res.json()
        setUsuario(autenticado)
        set('usuario', autenticado)
    }

    async function entrarComGoogle(idToken: string) {
        if (!GOOGLE_CLIENT_ID) {
            throw new Error('Login com Google desabilitado: NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurado.')
        }

        const res = await fetch(`${URL_BASE}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
        })

        if (!res.ok) {
            throw new Error('Não foi possível autenticar com Google.')
        }

        const autenticado = await res.json()
        setUsuario(autenticado)
        set('usuario', autenticado)
    }

    function sair() {
        router.push('/')
        setUsuario(null)
        remove('usuario')
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
                entrarComGoogle,
                sair,
            }}
        >
            {children}
        </ContextoUsuario.Provider>
    )
}

export default ContextoUsuario
