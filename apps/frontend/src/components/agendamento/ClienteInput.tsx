import { useMemo, useState } from 'react'
import { ClienteAdmin } from '@/components/admin/adminShared'

export interface ClienteInputProps {
    clientes: ClienteAdmin[]
    cliente: ClienteAdmin | null
    clienteMudou: (cliente: ClienteAdmin) => void
}

export default function ClienteInput(props: ClienteInputProps) {
    const [filtro, setFiltro] = useState('')

    const clientesFiltrados = useMemo(() => {
        const termo = filtro.trim().toLowerCase()
        if (!termo) return props.clientes

        return props.clientes.filter(
            (cliente) =>
                cliente.nome.toLowerCase().includes(termo) ||
                cliente.email.toLowerCase().includes(termo)
        )
    }, [props.clientes, filtro])

    return (
        <div className="flex flex-col gap-5">
            <span className="text-sm uppercase text-zinc-400">Selecione o cliente</span>
            <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar cliente por nome ou e-mail"
                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 w-full max-w-sm"
            />
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto max-w-sm">
                {clientesFiltrados.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Nenhum cliente encontrado.</p>
                ) : (
                    clientesFiltrados.map((cliente) => (
                        <div
                            key={cliente.id}
                            onClick={() => props.clienteMudou(cliente)}
                            className={`
                                cursor-pointer select-none border rounded-lg px-4 py-3
                                ${props.cliente?.id === cliente.id ? 'border-green-400 bg-green-400/10' : 'border-zinc-700 bg-zinc-900'}
                            `}
                        >
                            <p className="text-sm text-white">{cliente.nome}</p>
                            <p className="text-xs text-zinc-400">{cliente.email}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
