'use client'

import { useState } from 'react'

export interface SeletorHoraProps {
    value: string
    onChange: (valor: string) => void
    className?: string
}

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

function partesDeHorario(valor: string): [string, string] {
    const [h, m] = (valor || '').split(':')
    return [HORAS.includes(h) ? h : '08', MINUTOS.includes(m) ? m : '00']
}

export default function SeletorHora({ value, onChange, className }: SeletorHoraProps) {
    const [aberto, setAberto] = useState(false)
    const [horaTemp, setHoraTemp] = useState('08')
    const [minutoTemp, setMinutoTemp] = useState('00')

    function abrir() {
        const [h, m] = partesDeHorario(value)
        setHoraTemp(h)
        setMinutoTemp(m)
        setAberto(true)
    }

    function confirmar() {
        onChange(`${horaTemp}:${minutoTemp}`)
        setAberto(false)
    }

    return (
        <>
            <button
                type="button"
                onClick={abrir}
                className={className ?? 'bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-left'}
            >
                {value || 'HH:mm'}
            </button>

            {aberto ? (
                <div
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                    onClick={() => setAberto(false)}
                >
                    <div
                        className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 w-64"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-sm font-bold text-zinc-100 text-center mb-3">Escolher horário</p>
                        <div className="flex justify-center gap-1 h-44">
                            <div className="w-16 overflow-y-auto">
                                {HORAS.map((h) => (
                                    <button
                                        key={h}
                                        type="button"
                                        onClick={() => setHoraTemp(h)}
                                        className={`w-full py-2 rounded text-sm ${
                                            h === horaTemp ? 'bg-green-600 text-zinc-950 font-bold' : 'text-zinc-300'
                                        }`}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
                            <span className="text-zinc-100 text-lg font-bold self-center">:</span>
                            <div className="w-16 overflow-y-auto">
                                {MINUTOS.map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setMinutoTemp(m)}
                                        className={`w-full py-2 rounded text-sm ${
                                            m === minutoTemp ? 'bg-green-600 text-zinc-950 font-bold' : 'text-zinc-300'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => setAberto(false)}
                                className="button bg-zinc-700 flex-1 text-sm"
                            >
                                Cancelar
                            </button>
                            <button type="button" onClick={confirmar} className="button bg-green-600 flex-1 text-sm">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
}
