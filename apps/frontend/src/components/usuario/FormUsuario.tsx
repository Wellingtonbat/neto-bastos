'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { TelefoneUtils } from '@neto-bastos/core'
import { GoogleLogin } from '@react-oauth/google'
import useUsuario from '@/data/hooks/useUsuario'
import Logo from '@/components/shared/Logo'
import Image from 'next/image'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

export default function FormUsuario() {
    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [telefone, setTelefone] = useState('')
    const [erro, setErro] = useState('')
    const [enviando, setEnviando] = useState(false)

    const { usuario, entrar, entrarComGoogle } = useUsuario()
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const params = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        if (usuario?.email) {
            const dest = params.get('destino') as string
            router.push(dest ? dest : '/meus-agendamentos')
        }
    }, [usuario, router, params])

    async function entrarComValidacao() {
        const nomeAparado = nome.trim()
        const emailAparado = email.trim()

        if (!nomeAparado || !emailAparado) {
            setErro('Preencha nome e e-mail.')
            return
        }

        if (!EMAIL_REGEX.test(emailAparado)) {
            setErro('Informe um e-mail válido.')
            return
        }

        try {
            setErro('')
            setEnviando(true)
            await entrar({ nome: nomeAparado, email: emailAparado, telefone })
        } catch (e: any) {
            setErro(e?.message ?? 'Não foi possível entrar.')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="flex justify-center items-center h-screen relative">
            <Image src="/banners/principal.webp" fill alt="Barbearia" className="object-cover" />
            <div
                className="
                    flex flex-col justify-center items-center gap-10
                    absolute top-0 left-0 w-full h-full
                    bg-black/80 md:bg-transparent md:bg-gradient-to-r from-black/30 via-black/90 to-black/30
                "
            >
                <Logo />
                <div className="flex flex-col w-[85%] max-w-sm gap-5">
                    <div className="flex flex-col gap-4 rounded">
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Nome"
                            className="bg-zinc-900 px-4 py-2 rounded"
                        />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="E-mail"
                            className="bg-zinc-900 px-4 py-2 rounded"
                        />
                        <input
                            type="tel"
                            value={TelefoneUtils.formatar(telefone)}
                            onChange={(s) => setTelefone(TelefoneUtils.desformatar(s.target.value))}
                            placeholder="Telefone"
                            className="bg-zinc-900 px-4 py-2 rounded"
                        />
                        {erro ? (
                            <p className="text-sm text-red-400">{erro}</p>
                        ) : null}
                        <div className="flex gap-5">
                            <button
                                onClick={entrarComValidacao}
                                disabled={enviando}
                                className="button bg-green-600 flex-1 disabled:opacity-60"
                            >
                                {enviando ? 'Entrando...' : 'Entrar'}
                            </button>
                            <button
                                onClick={() => {
                                    router.push('/')
                                }}
                                className="button flex-1"
                            >
                                Cancelar
                            </button>
                        </div>
                        {googleClientId && (
                            <div className="flex justify-center bg-zinc-900/50 p-3 rounded">
                                <GoogleLogin
                                    onSuccess={async (credentialResponse) => {
                                        const token = credentialResponse.credential
                                        if (!token) return

                                        await entrarComGoogle(token)
                                    }}
                                    onError={() => {
                                        console.error('Falha no login com Google')
                                    }}
                                    theme="filled_black"
                                    text="continue_with"
                                    shape="pill"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
