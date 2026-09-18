import { useMemo, useState } from 'react'
import { ClienteAdmin } from '@/components/admin/adminShared'

export interface ClienteInputProps {
    clientes: ClienteAdmin[]
    cliente: ClienteAdmin | null
    clienteMudou: (cliente: ClienteAdmin) => void
    aoAlternarRecorrente?: (cliente: ClienteAdmin) => void
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
                            className={`
                                flex items-center justify-between gap-3 select-none border rounded-lg px-4 py-3
                                ${props.cliente?.id === cliente.id ? 'border-green-400 bg-green-400/10' : 'border-zinc-700 bg-zinc-900'}
                            `}
                        >
                            <div className="cursor-pointer flex-1" onClick={() => props.clienteMudou(cliente)}>
                                <p className="text-sm text-white">{cliente.nome}</p>
                                <p className="text-xs text-zinc-400">{cliente.email}</p>
                            </div>
                            {props.aoAlternarRecorrente ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        props.aoAlternarRecorrente!(cliente)
                                    }}
                                    className={`text-xs px-2 py-1 rounded border whitespace-nowrap ${
                                        cliente.clienteRecorrente
                                            ? 'border-green-500 text-green-400 bg-green-500/10'
                                            : 'border-zinc-600 text-zinc-400'
                                    }`}
                                >
                                    {cliente.clienteRecorrente ? '✓ Cliente fixo' : 'Marcar fixo'}
                                </button>
                            ) : null}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
