'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profissional } from '@neto-bastos/core'
import Cabecalho from '@/components/shared/Cabecalho'
import useAPI from '@/data/hooks/useAPI'
import useProfissionais from '@/data/hooks/useProfissionais'
import useUsuario from '@/data/hooks/useUsuario'
import AgendamentosTab from '@/components/admin/AgendamentosTab'
import ServicosTab from '@/components/admin/ServicosTab'
import BarbeirosTab from '@/components/admin/BarbeirosTab'
import AgendaTab from '@/components/admin/AgendaTab'

type AbaAdmin = 'AGENDAMENTOS' | 'SERVICOS' | 'BARBEIROS' | 'AGENDA'

export default function PaginaAdmin() {
    const router = useRouter()
    const { usuario, carregando: carregandoUsuario } = useUsuario()
    const { profissionais } = useProfissionais()
    const { httpGet } = useAPI()

    const [abaAtiva, setAbaAtiva] = useState<AbaAdmin>('AGENDAMENTOS')
    const [profissionaisAdmin, setProfissionaisAdmin] = useState<Profissional[]>([])

    const podeEntrarNoAdmin = useMemo(() => {
        return (
            usuario?.role === 'DONO' ||
            usuario?.role === 'BARBEIRO' ||
            usuario?.role === 'FUNCIONARIO'
        )
    }, [usuario?.role])

    async function carregarProfissionais() {
        const data = await httpGet('profissional')
        setProfissionaisAdmin(data ?? [])
    }

    function atualizarProfissionalLocal(atualizado: Profissional) {
        setProfissionaisAdmin((atual) =>
            atual.map((p) => (p.id === atualizado.id ? atualizado : p))
        )
    }

    useEffect(() => {
        if (podeEntrarNoAdmin) {
            carregarProfissionais()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [podeEntrarNoAdmin])

    useEffect(() => {
        if (profissionaisAdmin.length === 0 && profissionais.length > 0) {
            setProfissionaisAdmin(profissionais)
        }
    }, [profissionais, profissionaisAdmin.length])

    useEffect(() => {
        if (!carregandoUsuario && usuario && !podeEntrarNoAdmin) {
            router.replace('/meus-agendamentos')
        }
    }, [carregandoUsuario, usuario, podeEntrarNoAdmin, router])

    if (carregandoUsuario || !usuario) {
        return (
            <div className="bg-zinc-900 min-h-screen">
                <Cabecalho titulo="Area Administrativa" descricao="Carregando..." />
            </div>
        )
    }

    if (!podeEntrarNoAdmin) {
        return (
            <div className="bg-zinc-900 min-h-screen">
                <Cabecalho titulo="Area Administrativa" descricao="Acesso restrito." />
                <div className="container py-10 text-zinc-300">Redirecionando...</div>
            </div>
        )
    }

    return (
        <div className="bg-zinc-900 min-h-screen">
            <Cabecalho
                titulo="Area Administrativa"
                descricao="Gerencie agenda, confirme ou cancele horarios e mantenha servicos atualizados."
            />

            <div className="container py-10 space-y-8">
                <nav className="flex flex-wrap gap-2">
                    {[
                        { id: 'AGENDAMENTOS', label: 'Agendamentos' },
                        { id: 'SERVICOS', label: 'Servicos' },
                        { id: 'BARBEIROS', label: 'Barbeiros' },
                        { id: 'AGENDA', label: 'Agenda dos barbeiros' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setAbaAtiva(item.id as AbaAdmin)}
                            className={`px-4 py-2 rounded border ${abaAtiva === item.id
                                ? 'bg-yellow-400 text-zinc-900 border-yellow-300 font-semibold'
                                : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className={abaAtiva === 'AGENDAMENTOS' ? '' : 'hidden'}>
                    <AgendamentosTab profissionaisAdmin={profissionaisAdmin} />
                </div>

                <div className={abaAtiva === 'SERVICOS' ? '' : 'hidden'}>
                    <ServicosTab />
                </div>

                <div className={abaAtiva === 'BARBEIROS' ? '' : 'hidden'}>
                    <BarbeirosTab
                        profissionaisAdmin={profissionaisAdmin}
                        usuario={usuario}
                        onProfissionalCriado={carregarProfissionais}
                    />
                </div>

                <div className={abaAtiva === 'AGENDA' ? '' : 'hidden'}>
                    <AgendaTab
                        profissionaisAdmin={profissionaisAdmin}
                        usuario={usuario}
                        onProfissionalAtualizado={atualizarProfissionalLocal}
                    />
                </div>
            </div>
        </div>
    )
}
