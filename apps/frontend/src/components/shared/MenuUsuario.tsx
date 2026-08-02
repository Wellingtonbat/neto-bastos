'use client'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Usuario } from '@neto-bastos/core'
import Image from 'next/image'
import useUsuario from '@/data/hooks/useUsuario'
import { useRouter } from 'next/navigation'

export interface MenuUsuarioProps {
    usuario: Usuario
}

export default function MenuUsuario(props: MenuUsuarioProps) {
    const { sair } = useUsuario()
    const router = useRouter()
    const podeAcessarAdmin =
        props.usuario?.role === 'DONO' || props.usuario?.role === 'BARBEIRO'

    return props.usuario ? (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div className="flex gap-2 items-center">
                    <div className="flex flex-col items-end">
                        <span className="text-lg font-bold leading-5">{props.usuario.nome}</span>
                        <span className="text-xs text-zinc-400">{props.usuario.email}</span>
                    </div>
                    <div className="flex justify-center items-center rounded-full overflow-hidden w-10 h-10 p-1 bg-zinc-700">
                        <Image src="/avatar.png" width={40} height={40} alt={props.usuario.nome} />
                    </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel>Menu Usuário</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/meus-agendamentos')}>
                    Meus agendamentos
                </DropdownMenuItem>
                {podeAcessarAdmin ? (
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                        Área administrativa
                    </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={sair}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ) : null
}
