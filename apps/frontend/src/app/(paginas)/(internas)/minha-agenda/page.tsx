'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profissional } from '@neto-bastos/core'
import Cabecalho from '@/components/shared/Cabecalho'
import useAPI from '@/data/hooks/useAPI'
import useProfissionais from '@/data/hooks/useProfissionais'
import useUsuario from '@/data/hooks/useUsuario'
import AgendamentosTab from '@/components/admin/AgendamentosTab'

export default function PaginaMinhaAgenda() {
    const router = useRouter()
    const { usuario, carregando: carregandoUsuario } = useUsuario()
    const { profissionais } = useProfissionais()
    const { httpGet } = useAPI()

    const [profissionaisAdmin, setProfissionaisAdmin] = useState<Profissional[]>([])

    const temAgendaPropria = useMemo(() => {
        return !!usuario?.profissionalId || usuario?.role === 'FUNCIONARIO'
    }, [usuario?.profissionalId, usuario?.role])

    async function carregarProfissionais() {
        const data = await httpGet('profissional')
        setProfissionaisAdmin(data ?? [])
    }

    useEffect(() => {
        if (temAgendaPropria) {
            carregarProfissionais()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [temAgendaPropria])

    useEffect(() => {
        if (profissionaisAdmin.length === 0 && profissionais.length > 0) {
            setProfissionaisAdmin(profissionais)
        }
    }, [profissionais, profissionaisAdmin.length])

    useEffect(() => {
        if (!carregandoUsuario && usuario && !temAgendaPropria) {
            router.replace('/meus-agendamentos')
        }
    }, [carregandoUsuario, usuario, temAgendaPropria, router])

    if (carregandoUsuario || !usuario) {
        return (
            <div className="bg-zinc-900 min-h-screen">
                <Cabecalho titulo="Minha Agenda" descricao="Carregando..." />
            </div>
        )
    }

    if (!temAgendaPropria) {
        return (
            <div className="bg-zinc-900 min-h-screen">
                <Cabecalho titulo="Minha Agenda" descricao="Acesso restrito." />
                <div className="container py-10 text-zinc-300">Redirecionando...</div>
            </div>
        )
    }

    return (
        <div className="bg-zinc-900 min-h-screen">
            <Cabecalho
                titulo="Minha Agenda"
                descricao="Acompanhe e gerencie seus atendimentos: confirme, cancele ou agende para um cliente."
            />

            <div className="container py-10">
                <AgendamentosTab profissionaisAdmin={profissionaisAdmin} />
            </div>
        </div>
    )
}
