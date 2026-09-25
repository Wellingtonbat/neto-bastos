'use client'

import { useState } from 'react'
import { TelefoneUtils } from '@neto-bastos/core'
import useUsuario from '@/data/hooks/useUsuario'

export interface EditarPerfilModalProps {
    aoFechar: () => void
}

export default function EditarPerfilModal(props: EditarPerfilModalProps) {
    const { usuario, atualizarMeuPerfil } = useUsuario()
    const [nome, setNome] = useState(usuario?.nome ?? '')
    const [telefone, setTelefone] = useState(usuario?.telefone ?? '')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')

    async function salvar() {
        if (!nome.trim()) {
            setErro('Informe seu nome.')
            return
        }

        try {
            setErro('')
            setSalvando(true)
            await atualizarMeuPerfil({ nome: nome.trim(), telefone })
            props.aoFechar()
        } catch (e: any) {
            setErro(e?.message ?? 'Não foi possível salvar as alterações.')
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-sm w-full space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-100">Editar perfil</h3>
                    <button
                        onClick={props.aoFechar}
                        className="text-zinc-400 hover:text-zinc-200"
                        type="button"
                        aria-label="Fechar"
                    >
                        ✕
                    </button>
                </div>

                {erro ? <p className="text-sm text-red-400">{erro}</p> : null}

                <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Nome</label>
                    <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Telefone</label>
                    <input
                        type="tel"
                        value={TelefoneUtils.formatar(telefone)}
                        onChange={(e) => setTelefone(TelefoneUtils.desformatar(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-zinc-400">E-mail</label>
                    <input
                        type="email"
                        value={usuario?.email ?? ''}
                        disabled
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2 text-zinc-500"
                    />
                    <p className="text-xs text-zinc-500">O e-mail é usado para entrar e não pode ser alterado aqui.</p>
                </div>

                <button
                    onClick={salvar}
                    disabled={salvando}
                    className="button bg-green-600 w-full"
                    type="button"
                >
                    {salvando ? 'Salvando...' : 'Salvar alterações'}
                </button>
            </div>
        </div>
    )
}
