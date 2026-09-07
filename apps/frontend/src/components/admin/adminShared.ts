import { Agendamento } from '@neto-bastos/core'

export type StatusAgendamento = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO'

export type AgendamentoComStatus = Agendamento & {
    id: number
    status?: StatusAgendamento
}

export type ClienteAdmin = {
    id: number
    nome: string
    email: string
    telefone?: string | null
}

export type RolePerfil = 'BARBEIRO' | 'CLIENTE' | 'DONO' | 'FUNCIONARIO'

export type BarbeiroAdmin = {
    id: number
    nome: string
    email: string
    telefone?: string | null
    role: RolePerfil
    profissionalId?: number | null
    profissional?: {
        id: number
        nome: string
        descricao: string
        imagemUrl: string
    } | null
}

export const STATUS_LABEL: Record<StatusAgendamento, string> = {
    PENDENTE: 'Pendente',
    CONFIRMADO: 'Confirmado',
    CANCELADO: 'Cancelado',
}

export const DIAS_SEMANA = [
    { valor: 0, label: 'Dom' },
    { valor: 1, label: 'Seg' },
    { valor: 2, label: 'Ter' },
    { valor: 3, label: 'Qua' },
    { valor: 4, label: 'Qui' },
    { valor: 5, label: 'Sex' },
    { valor: 6, label: 'Sab' },
]

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
export const TAMANHO_PAGINA_BARBEIROS = 6

export function mascararTelefone(valor: string) {
    const digitos = valor.replace(/\D/g, '').slice(0, 11)

    if (digitos.length <= 2) return digitos

    if (digitos.length <= 6) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
    }

    if (digitos.length <= 10) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
    }

    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

export function obterTokenLocal(): string | null {
    if (typeof window === 'undefined') return null
    const bruto = window.localStorage.getItem('usuario')
    if (!bruto) return null
    try {
        const usuarioLocal = JSON.parse(bruto)
        return usuarioLocal?.token ?? null
    } catch {
        return null
    }
}
