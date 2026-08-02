'use client'

import Link from 'next/link'
import Logo from './Logo'
import MenuUsuario from './MenuUsuario'
import useUsuario from '@/data/hooks/useUsuario'

export default function MenuSuperior() {
    const { usuario } = useUsuario()

    return (
        <header className="self-stretch flex justify-center items-center h-24 bg-black/60">
            <nav className="flex items-center justify-between container px-5 lg:px-8">
                <Logo />
                <div>
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
            </nav>
        </header>
    )
}
