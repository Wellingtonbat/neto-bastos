'use client'

import { useEffect, useRef, useState } from 'react'

interface LoaderRequisicoesGlobaisProps {
    children: React.ReactNode
}

export default function LoaderRequisicoesGlobais(props: LoaderRequisicoesGlobaisProps) {
    const [pendentes, setPendentes] = useState(0)
    const originalFetchRef = useRef<typeof window.fetch | null>(null)

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (originalFetchRef.current) return

        const originalFetch = window.fetch.bind(window)
        originalFetchRef.current = originalFetch

        window.fetch = async (...args) => {
            setPendentes((atual) => atual + 1)
            try {
                return await originalFetch(...args)
            } finally {
                setPendentes((atual) => Math.max(0, atual - 1))
            }
        }

        return () => {
            if (originalFetchRef.current) {
                window.fetch = originalFetchRef.current
                originalFetchRef.current = null
            }
        }
    }, [])

    return (
        <>
            {props.children}
            {pendentes > 0 ? (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
                    <div className="flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 shadow-xl">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-yellow-400" />
                        <span className="text-sm">Carregando...</span>
                    </div>
                </div>
            ) : null}
        </>
    )
}
