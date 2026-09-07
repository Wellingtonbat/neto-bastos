'use client'

import { Servico, servicos as servicosFallback } from '@neto-bastos/core'
import { useEffect, useState } from 'react'

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE

export default function useServicos() {
    const [servicos, setServicos] = useState<Servico[]>(servicosFallback)

    useEffect(() => {
        let ativo = true

        async function carregar() {
            try {
                const res = await fetch(`${URL_BASE}/servico`)
                if (!res.ok) return
                const dados = await res.json()
                if (ativo && Array.isArray(dados) && dados.length > 0) {
                    setServicos(dados)
                }
            } catch {
                // Mantem fallback local quando API indisponivel.
            }
        }

        carregar()

        return () => {
            ativo = false
        }
    }, [])

    return {
        servicos,
    }
}
