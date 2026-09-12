'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconMenu2, IconX } from '@tabler/icons-react'
import Logo from './Logo'
import MenuUsuario from './MenuUsuario'
import useUsuario from '@/data/hooks/useUsuario'

interface ItemMenu {
    href: string
    label: string
}

export default function MenuSuperior() {
    const { usuario } = useUsuario()
    const pathname = usePathname()
    const [menuAberto, setMenuAberto] = useState(false)

    const ehDono = usuario?.role === 'DONO'
    const temAgendaPropria = !!usuario?.profissionalId || usuario?.role === 'FUNCIONARIO'

    const itens: ItemMenu[] = [
        { href: '/', label: 'Início' },
        { href: '/agendamento', label: 'Agendamento' },
        ...(usuario ? [{ href: '/meus-agendamentos', label: 'Meus Agendamentos' }] : []),
        ...(temAgendaPropria ? [{ href: '/minha-agenda', label: 'Minha Agenda' }] : []),
        ...(ehDono ? [{ href: '/admin', label: 'Adm' }] : []),
    ]

    function linkClasse(href: string) {
        const ativo = href === '/' ? pathname === '/' : pathname?.startsWith(href)
        return `text-sm font-medium leading-none transition-colors ${
            ativo ? 'text-white' : 'text-zinc-400 hover:text-zinc-100'
        }`
    }

    return (
        <header className="self-stretch flex justify-center items-center min-h-24 bg-black/60 relative z-[60]">
            <nav className="flex items-center justify-between container px-5 lg:px-8 py-3 gap-4">
                <Logo />

                <div className="hidden md:flex items-center gap-6">
                    {itens.map((item) => (
                        <Link key={item.href} href={item.href} className={linkClasse(item.href)}>
                            {item.label}
                        </Link>
                    ))}
                </div>

                <div className="hidden md:block">
                    {usuario ? (
                        <MenuUsuario usuario={usuario} />
                    ) : (
                        <Link
                            href="/entrar"
                            className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium leading-none text-zinc-100 hover:bg-zinc-800/70"
                        >
                            Entrar
                        </Link>
                    )}
                </div>

                <button
                    className="md:hidden text-zinc-100 p-2"
                    onClick={() => setMenuAberto((aberto) => !aberto)}
                    aria-label="Abrir menu"
                >
                    {menuAberto ? <IconX size={26} /> : <IconMenu2 size={26} />}
                </button>
            </nav>

            {menuAberto ? (
                <div className="md:hidden absolute top-full left-0 right-0 bg-zinc-950 border-t border-zinc-800 flex flex-col px-5 py-4 gap-4">
                    {itens.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={linkClasse(item.href)}
                            onClick={() => setMenuAberto(false)}
                        >
                            {item.label}
                        </Link>
                    ))}
                    <div className="pt-2 border-t border-zinc-800">
                        {usuario ? (
                            <MenuUsuario usuario={usuario} />
                        ) : (
                            <Link
                                href="/entrar"
                                className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium leading-none text-zinc-100 hover:bg-zinc-800/70"
                                onClick={() => setMenuAberto(false)}
                            >
                                Entrar
                            </Link>
                        )}
                    </div>
                </div>
            ) : null}
        </header>
    )
}
