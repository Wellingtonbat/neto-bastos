'use client'

import { useEffect, useMemo, useState } from 'react'
import { Profissional, Servico, Agendamento } from '@neto-bastos/core'
import Cabecalho from '@/components/shared/Cabecalho'
import useAPI from '@/data/hooks/useAPI'
import useProfissionais from '@/data/hooks/useProfissionais'
import useUsuario from '@/data/hooks/useUsuario'
import Image from 'next/image'

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const TAMANHO_PAGINA_BARBEIROS = 6

type StatusAgendamento = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO'

type AgendamentoComStatus = Agendamento & {
    id: number
    status?: StatusAgendamento
}

type ClienteAdmin = {
    id: number
    nome: string
    email: string
    telefone?: string | null
}

type BarbeiroAdmin = {
    id: number
    nome: string
    email: string
    telefone?: string | null
    role: 'BARBEIRO' | 'CLIENTE' | 'DONO'
    profissionalId?: number | null
    profissional?: {
        id: number
        nome: string
        descricao: string
        imagemUrl: string
    } | null
}

type AcaoCarregando =
    | 'CARREGAR_TUDO'
    | 'CRIAR_AGENDAMENTO'
    | 'ATUALIZAR_STATUS'
    | 'EXCLUIR_AGENDAMENTO'
    | 'CADASTRAR_SERVICO'
    | 'CADASTRAR_BARBEIRO'
    | 'EDITAR_BARBEIRO'
    | 'INATIVAR_BARBEIRO'
    | 'REATIVAR_BARBEIRO'
    | 'EXCLUIR_SERVICO'
    | 'SALVAR_SERVICO'
    | 'SALVAR_AGENDA'
    | null

type AbaAdmin = 'AGENDAMENTOS' | 'SERVICOS' | 'BARBEIROS' | 'AGENDA'
type VisualizacaoBarbeiros = 'ATIVOS' | 'INATIVOS'

const STATUS_LABEL: Record<StatusAgendamento, string> = {
    PENDENTE: 'Pendente',
    CONFIRMADO: 'Confirmado',
    CANCELADO: 'Cancelado',
}

const DIAS_SEMANA = [
    { valor: 0, label: 'Dom' },
    { valor: 1, label: 'Seg' },
    { valor: 2, label: 'Ter' },
    { valor: 3, label: 'Qua' },
    { valor: 4, label: 'Qui' },
    { valor: 5, label: 'Sex' },
    { valor: 6, label: 'Sab' },
]

function mascararTelefone(valor: string) {
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

export default function PaginaAdmin() {
    const { usuario } = useUsuario()
    const { profissionais } = useProfissionais()
    const { httpGet, httpPost, httpPatch, httpDelete } = useAPI()
    const [abaAtiva, setAbaAtiva] = useState<AbaAdmin>('AGENDAMENTOS')

    const [agendamentos, setAgendamentos] = useState<AgendamentoComStatus[]>([])
    const [clientes, setClientes] = useState<ClienteAdmin[]>([])
    const [barbeiros, setBarbeiros] = useState<BarbeiroAdmin[]>([])
    const [barbeirosInativos, setBarbeirosInativos] = useState<BarbeiroAdmin[]>([])
    const [servicos, setServicos] = useState<Servico[]>([])
    const [profissionaisAdmin, setProfissionaisAdmin] = useState<Profissional[]>([])
    const [carregando, setCarregando] = useState(true)
    const [acaoCarregando, setAcaoCarregando] = useState<AcaoCarregando>(null)
    const [erro, setErro] = useState('')

    const [filtroStatus, setFiltroStatus] = useState<'TODOS' | StatusAgendamento>('TODOS')
    const [filtroProfissional, setFiltroProfissional] = useState<string>('todos')

    const [clienteIdSelecionado, setClienteIdSelecionado] = useState('')
    const [filtroCliente, setFiltroCliente] = useState('')
    const [nomeCliente, setNomeCliente] = useState('')
    const [emailCliente, setEmailCliente] = useState('')
    const [telefoneCliente, setTelefoneCliente] = useState('')
    const [profissionalId, setProfissionalId] = useState<string>('')
    const [dataHora, setDataHora] = useState('')
    const [servicosSelecionados, setServicosSelecionados] = useState<number[]>([])

    const [novoServicoNome, setNovoServicoNome] = useState('')
    const [novoServicoDescricao, setNovoServicoDescricao] = useState('')
    const [novoServicoPreco, setNovoServicoPreco] = useState('')
    const [novoServicoSlots, setNovoServicoSlots] = useState('1')
    const [novoServicoImagem, setNovoServicoImagem] = useState('/servicos/corte-de-cabelo.jpg')

    const [servicoEditandoId, setServicoEditandoId] = useState<number | null>(null)
    const [servicoEdicaoNome, setServicoEdicaoNome] = useState('')
    const [servicoEdicaoDescricao, setServicoEdicaoDescricao] = useState('')
    const [servicoEdicaoPreco, setServicoEdicaoPreco] = useState('')
    const [servicoEdicaoSlots, setServicoEdicaoSlots] = useState('1')
    const [servicoEdicaoImagem, setServicoEdicaoImagem] = useState('')

    const [profissionalAgendaId, setProfissionalAgendaId] = useState<string>('')
    const [diasTrabalho, setDiasTrabalho] = useState<number[]>([1, 2, 3, 4, 5, 6])
    const [horaInicio, setHoraInicio] = useState('08:00')
    const [horaFim, setHoraFim] = useState('19:00')
    const [tempoSlotMinutos, setTempoSlotMinutos] = useState('15')

    const [carregandoUploadNovoServico, setCarregandoUploadNovoServico] = useState(false)
    const [carregandoUploadEdicaoServico, setCarregandoUploadEdicaoServico] = useState(false)

    const [nomeBarbeiro, setNomeBarbeiro] = useState('')
    const [emailBarbeiro, setEmailBarbeiro] = useState('')
    const [telefoneBarbeiro, setTelefoneBarbeiro] = useState('')
    const [nomeProfissionalCadastro, setNomeProfissionalCadastro] = useState('')
    const [descricaoProfissionalCadastro, setDescricaoProfissionalCadastro] = useState('')
    const [imagemProfissionalCadastro, setImagemProfissionalCadastro] = useState('/profissionais/profissional-1.jpg')
    const [carregandoUploadProfissionalCadastro, setCarregandoUploadProfissionalCadastro] = useState(false)
    const [modalBarbeiroAberto, setModalBarbeiroAberto] = useState(false)
    const [barbeiroEditandoId, setBarbeiroEditandoId] = useState<number | null>(null)
    const [profissionalEditandoId, setProfissionalEditandoId] = useState<number | null>(null)
    const [filtroBarbeiros, setFiltroBarbeiros] = useState('')
    const [paginaBarbeiros, setPaginaBarbeiros] = useState(1)
    const [barbeiroPendenteInativacao, setBarbeiroPendenteInativacao] = useState<BarbeiroAdmin | null>(null)
    const [visualizacaoBarbeiros, setVisualizacaoBarbeiros] = useState<VisualizacaoBarbeiros>('ATIVOS')
    const [confirmacaoNomeInativacao, setConfirmacaoNomeInativacao] = useState('')

    const podeEntrarNoAdmin = useMemo(() => {
        return usuario?.role === 'DONO' || usuario?.role === 'BARBEIRO'
    }, [usuario?.role])

    const profissionaisPermitidosAgenda = useMemo(() => {
        if (usuario?.role === 'BARBEIRO') {
            return profissionaisAdmin.filter((p) => p.id === usuario.profissionalId)
        }
        return profissionaisAdmin
    }, [profissionaisAdmin, usuario?.profissionalId, usuario?.role])

    const profissionalAgendaSelecionado = useMemo(() => {
        return profissionaisAdmin.find((p) => String(p.id) === profissionalAgendaId) ?? null
    }, [profissionaisAdmin, profissionalAgendaId])

    const clientesFiltrados = useMemo(() => {
        const termo = filtroCliente.trim().toLowerCase()
        if (!termo) return clientes

        return clientes.filter((cliente) => {
            return (
                cliente.nome.toLowerCase().includes(termo) ||
                cliente.email.toLowerCase().includes(termo)
            )
        })
    }, [clientes, filtroCliente])

    const regexHora = /^([01]\d|2[0-3]):([0-5]\d)$/
    const erroProfissionalAgenda = !profissionalAgendaId
    const erroDiasTrabalho = diasTrabalho.length === 0
    const erroHoraInicio = !regexHora.test(horaInicio)
    const erroHoraFimFormato = !regexHora.test(horaFim)

    const minutosInicio = !erroHoraInicio ? Number(horaInicio.slice(0, 2)) * 60 + Number(horaInicio.slice(3, 5)) : 0
    const minutosFim = !erroHoraFimFormato ? Number(horaFim.slice(0, 2)) * 60 + Number(horaFim.slice(3, 5)) : 0
    const erroJanelaHora = !erroHoraInicio && !erroHoraFimFormato && minutosFim <= minutosInicio

    const slot = Number(tempoSlotMinutos)
    const erroTempoSlot = !Number.isInteger(slot) || slot < 5 || slot > 120

    const erroAgendaFormulario = useMemo(() => {
        if (erroProfissionalAgenda) return 'Selecione um barbeiro para editar a agenda.'

        if (erroDiasTrabalho) {
            return 'Selecione ao menos um dia de trabalho.'
        }

        if (erroHoraInicio || erroHoraFimFormato) {
            return 'Informe horarios validos no formato HH:mm.'
        }

        if (erroJanelaHora) {
            return 'A hora fim deve ser maior que a hora inicio.'
        }

        if (erroTempoSlot) {
            return 'Tempo por slot deve ser um numero inteiro entre 5 e 120.'
        }

        return ''
    }, [erroDiasTrabalho, erroHoraFimFormato, erroHoraInicio, erroJanelaHora, erroProfissionalAgenda, erroTempoSlot])

    const emailBarbeiroNormalizado = emailBarbeiro.trim().toLowerCase()
    const telefoneBarbeiroDigitos = telefoneBarbeiro.replace(/\D/g, '')
    const erroEmailBarbeiro =
        emailBarbeiro.trim().length > 0 && !EMAIL_REGEX.test(emailBarbeiroNormalizado)
    const erroTelefoneBarbeiro =
        telefoneBarbeiro.trim().length > 0 &&
        telefoneBarbeiroDigitos.length !== 10 &&
        telefoneBarbeiroDigitos.length !== 11

    const barbeirosFiltrados = useMemo(() => {
        const termo = filtroBarbeiros.trim().toLowerCase()
        const origem = visualizacaoBarbeiros === 'ATIVOS' ? barbeiros : barbeirosInativos

        if (!termo) return origem

        return origem.filter((barbeiro) => {
            return (
                barbeiro.nome.toLowerCase().includes(termo) ||
                barbeiro.email.toLowerCase().includes(termo) ||
                (barbeiro.profissional?.nome ?? '').toLowerCase().includes(termo)
            )
        })
    }, [barbeiros, barbeirosInativos, filtroBarbeiros, visualizacaoBarbeiros])

    const totalPaginasBarbeiros = Math.max(
        1,
        Math.ceil(barbeirosFiltrados.length / TAMANHO_PAGINA_BARBEIROS)
    )

    const barbeirosPaginados = useMemo(() => {
        const inicio = (paginaBarbeiros - 1) * TAMANHO_PAGINA_BARBEIROS
        const fim = inicio + TAMANHO_PAGINA_BARBEIROS
        return barbeirosFiltrados.slice(inicio, fim)
    }, [barbeirosFiltrados, paginaBarbeiros])

    async function carregarServicos() {
        const data = await httpGet('servico')
        setServicos(data ?? [])
    }

    async function carregarClientes() {
        const data = await httpGet('auth/clientes')
        setClientes(data ?? [])
    }

    async function carregarBarbeiros() {
        try {
            const data = await httpGet('auth/barbeiros')
            setBarbeiros(data ?? [])
        } catch {
            // Usuarios sem permissao (ex.: BARBEIRO) nao devem quebrar o carregamento do admin.
            setBarbeiros([])
        }
    }

    async function carregarBarbeirosInativos() {
        try {
            const data = await httpGet('auth/barbeiros/inativos')
            setBarbeirosInativos(data ?? [])
        } catch {
            setBarbeirosInativos([])
        }
    }

    async function carregarProfissionais() {
        const data = await httpGet('profissional')
        setProfissionaisAdmin(data ?? [])
    }

    async function carregarAgendamentos() {
        const params = new URLSearchParams()
        if (filtroStatus !== 'TODOS') params.set('status', filtroStatus)
        if (filtroProfissional !== 'todos') params.set('profissionalId', filtroProfissional)

        const query = params.toString()
        const data = await httpGet(`agendamentos${query ? `?${query}` : ''}`)
        setAgendamentos(data ?? [])
    }

    async function carregarTudo() {
        try {
            setCarregando(true)
            setAcaoCarregando('CARREGAR_TUDO')
            setErro('')
            await Promise.all([
                carregarServicos(),
                carregarAgendamentos(),
                carregarProfissionais(),
                carregarClientes(),
                carregarBarbeiros(),
                carregarBarbeirosInativos(),
            ])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel carregar os dados.')
        } finally {
            setCarregando(false)
            setAcaoCarregando(null)
        }
    }

    function selecionarCliente(clienteId: string) {
        setClienteIdSelecionado(clienteId)
        const cliente = clientes.find((c) => String(c.id) === clienteId)

        if (!cliente) {
            setNomeCliente('')
            setEmailCliente('')
            setTelefoneCliente('')
            return
        }

        setNomeCliente(cliente.nome)
        setEmailCliente(cliente.email)
        setTelefoneCliente(cliente.telefone ?? '')
    }

    useEffect(() => {
        carregarTudo()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroStatus, filtroProfissional])

    useEffect(() => {
        if (profissionaisAdmin.length === 0 && profissionais.length > 0) {
            setProfissionaisAdmin(profissionais)
        }
    }, [profissionais, profissionaisAdmin.length])

    useEffect(() => {
        if (usuario?.role === 'DONO') {
            carregarBarbeiros()
            carregarBarbeirosInativos()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuario?.role])

    useEffect(() => {
        setPaginaBarbeiros(1)
    }, [filtroBarbeiros, visualizacaoBarbeiros])

    useEffect(() => {
        if (paginaBarbeiros > totalPaginasBarbeiros) {
            setPaginaBarbeiros(totalPaginasBarbeiros)
        }
    }, [paginaBarbeiros, totalPaginasBarbeiros])

    useEffect(() => {
        if (profissionaisAdmin.length === 0) return

        const idPadrao =
            usuario?.role === 'BARBEIRO'
                ? String(usuario.profissionalId ?? '')
                : String(profissionaisAdmin[0]?.id ?? '')

        if (!profissionalAgendaId && idPadrao) {
            setProfissionalAgendaId(idPadrao)
        }
    }, [profissionaisAdmin, profissionalAgendaId, usuario?.profissionalId, usuario?.role])

    useEffect(() => {
        if (!profissionalAgendaSelecionado) return

        setDiasTrabalho(profissionalAgendaSelecionado.diasTrabalho ?? [1, 2, 3, 4, 5, 6])
        setHoraInicio(profissionalAgendaSelecionado.horaInicio ?? '08:00')
        setHoraFim(profissionalAgendaSelecionado.horaFim ?? '19:00')
        setTempoSlotMinutos(String(profissionalAgendaSelecionado.tempoSlotMinutos ?? 15))
    }, [profissionalAgendaSelecionado])

    function alternarServico(id: number) {
        setServicosSelecionados((atual) =>
            atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]
        )
    }

    function alternarDia(dia: number) {
        setDiasTrabalho((atual) =>
            atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia].sort((a, b) => a - b)
        )
    }

    function iniciarEdicaoServico(servico: Servico) {
        setServicoEditandoId(servico.id)
        setServicoEdicaoNome(servico.nome)
        setServicoEdicaoDescricao(servico.descricao)
        setServicoEdicaoPreco(String(servico.preco))
        setServicoEdicaoSlots(String(servico.qtdeSlots))
        setServicoEdicaoImagem(servico.imagemURL)
    }

    function obterTokenLocal(): string | null {
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

    async function uploadImagemParaServidor(file: File) {
        const token = obterTokenLocal()
        if (!token) {
            throw new Error('Usuario nao autenticado para upload de imagem.')
        }

        const formData = new FormData()
        formData.append('arquivo', file)

        const res = await fetch(`${URL_BASE}/servico/upload-imagem`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        })

        if (!res.ok) {
            let mensagem = 'Falha ao enviar imagem.'
            try {
                const erro = await res.json()
                mensagem = Array.isArray(erro?.message)
                    ? erro.message.join(', ')
                    : erro?.message ?? mensagem
            } catch {
                // Mantem mensagem padrao.
            }
            throw new Error(mensagem)
        }

        const data = await res.json()
        if (!data?.imagemURL) {
            throw new Error('Backend nao retornou URL da imagem.')
        }
        return data.imagemURL as string
    }

    async function uploadImagemNovoServico(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            setErro('')
            setCarregandoUploadNovoServico(true)
            const imagemURL = await uploadImagemParaServidor(file)
            setNovoServicoImagem(imagemURL)
        } catch (e: any) {
            setErro(e?.message ?? 'Falha ao carregar imagem do servico.')
        } finally {
            setCarregandoUploadNovoServico(false)
            event.target.value = ''
        }
    }

    async function uploadImagemEdicaoServico(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            setErro('')
            setCarregandoUploadEdicaoServico(true)
            const imagemURL = await uploadImagemParaServidor(file)
            setServicoEdicaoImagem(imagemURL)
        } catch (e: any) {
            setErro(e?.message ?? 'Falha ao carregar imagem do servico.')
        } finally {
            setCarregandoUploadEdicaoServico(false)
            event.target.value = ''
        }
    }

    async function uploadImagemProfissional(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            setErro('')
            setCarregandoUploadProfissionalCadastro(true)

            const token = obterTokenLocal()
            if (!token) {
                throw new Error('Usuario nao autenticado para upload de imagem.')
            }

            const formData = new FormData()
            formData.append('arquivo', file)

            const res = await fetch(`${URL_BASE}/profissional/upload-imagem`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            })

            if (!res.ok) {
                let mensagem = 'Falha ao enviar imagem do profissional.'
                try {
                    const erroReq = await res.json()
                    mensagem = Array.isArray(erroReq?.message)
                        ? erroReq.message.join(', ')
                        : erroReq?.message ?? mensagem
                } catch {
                    // Mantem mensagem padrao.
                }
                throw new Error(mensagem)
            }

            const data = await res.json()
            if (!data?.imagemUrl) {
                throw new Error('Backend nao retornou URL da imagem do profissional.')
            }

            setImagemProfissionalCadastro(data.imagemUrl)
        } catch (e: any) {
            setErro(e?.message ?? 'Falha ao carregar imagem do profissional.')
        } finally {
            setCarregandoUploadProfissionalCadastro(false)
            event.target.value = ''
        }
    }

    async function cadastrarBarbeiroCompleto() {
        try {
            setErro('')
            setAcaoCarregando('CADASTRAR_BARBEIRO')

            if (
                !nomeBarbeiro ||
                !emailBarbeiro ||
                !nomeProfissionalCadastro ||
                !descricaoProfissionalCadastro ||
                !imagemProfissionalCadastro
            ) {
                setErro('Preencha os dados do barbeiro e do profissional.')
                return
            }

            if (!EMAIL_REGEX.test(emailBarbeiroNormalizado)) {
                setErro('Informe um e-mail valido para o barbeiro.')
                return
            }

            if (erroTelefoneBarbeiro) {
                setErro('Telefone do barbeiro invalido. Use 10 ou 11 digitos com DDD.')
                return
            }

            const profissionalCriado = await httpPost('profissional', {
                nome: nomeProfissionalCadastro,
                descricao: descricaoProfissionalCadastro,
                imagemUrl: imagemProfissionalCadastro,
            })

            await httpPost('auth/barbeiros', {
                nome: nomeBarbeiro,
                email: emailBarbeiroNormalizado,
                telefone: telefoneBarbeiroDigitos || undefined,
                profissionalId: profissionalCriado.id,
            })

            limparFormularioBarbeiro()
            setModalBarbeiroAberto(false)
            await carregarProfissionais()
            await carregarBarbeiros()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel cadastrar barbeiro.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    function limparFormularioBarbeiro() {
        setNomeBarbeiro('')
        setEmailBarbeiro('')
        setTelefoneBarbeiro('')
        setNomeProfissionalCadastro('')
        setDescricaoProfissionalCadastro('')
        setImagemProfissionalCadastro('/profissionais/profissional-1.jpg')
        setBarbeiroEditandoId(null)
        setProfissionalEditandoId(null)
    }

    function abrirModalNovoBarbeiro() {
        limparFormularioBarbeiro()
        setModalBarbeiroAberto(true)
    }

    function abrirModalEditarBarbeiro(barbeiro: BarbeiroAdmin) {
        setBarbeiroEditandoId(barbeiro.id)
        setProfissionalEditandoId(barbeiro.profissional?.id ?? null)
        setNomeBarbeiro(barbeiro.nome)
        setEmailBarbeiro(barbeiro.email)
        setTelefoneBarbeiro(mascararTelefone(barbeiro.telefone ?? ''))
        setNomeProfissionalCadastro(barbeiro.profissional?.nome ?? '')
        setDescricaoProfissionalCadastro(barbeiro.profissional?.descricao ?? '')
        setImagemProfissionalCadastro(
            barbeiro.profissional?.imagemUrl ?? '/profissionais/profissional-1.jpg'
        )
        setModalBarbeiroAberto(true)
    }

    async function salvarEdicaoBarbeiro() {
        if (!barbeiroEditandoId || !profissionalEditandoId) {
            setErro('Barbeiro selecionado para edicao e invalido.')
            return
        }

        try {
            setErro('')
            setAcaoCarregando('EDITAR_BARBEIRO')

            if (
                !nomeBarbeiro ||
                !emailBarbeiro ||
                !nomeProfissionalCadastro ||
                !descricaoProfissionalCadastro ||
                !imagemProfissionalCadastro
            ) {
                setErro('Preencha os dados do barbeiro e do profissional.')
                return
            }

            if (!EMAIL_REGEX.test(emailBarbeiroNormalizado)) {
                setErro('Informe um e-mail valido para o barbeiro.')
                return
            }

            if (erroTelefoneBarbeiro) {
                setErro('Telefone do barbeiro invalido. Use 10 ou 11 digitos com DDD.')
                return
            }

            await httpPatch(`profissional/${profissionalEditandoId}`, {
                nome: nomeProfissionalCadastro,
                descricao: descricaoProfissionalCadastro,
                imagemUrl: imagemProfissionalCadastro,
            })

            await httpPatch(`auth/barbeiros/${barbeiroEditandoId}`, {
                nome: nomeBarbeiro,
                email: emailBarbeiroNormalizado,
                telefone: telefoneBarbeiroDigitos || undefined,
            })

            limparFormularioBarbeiro()
            setModalBarbeiroAberto(false)
            await Promise.all([carregarProfissionais(), carregarBarbeiros()])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel editar barbeiro.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function inativarBarbeiro(usuarioId: number) {
        try {
            setErro('')
            setAcaoCarregando('INATIVAR_BARBEIRO')
            await httpPatch(`auth/barbeiros/${usuarioId}/inativar`, {})
            await Promise.all([carregarBarbeiros(), carregarBarbeirosInativos()])
            setBarbeiroPendenteInativacao(null)
            setConfirmacaoNomeInativacao('')
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel inativar barbeiro.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function reativarBarbeiro(usuarioId: number) {
        try {
            setErro('')
            setAcaoCarregando('REATIVAR_BARBEIRO')
            await httpPatch(`auth/barbeiros/${usuarioId}/reativar`, {})
            await Promise.all([carregarBarbeiros(), carregarBarbeirosInativos()])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel reativar barbeiro.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function criarAgendamento() {
        try {
            setErro('')
            setAcaoCarregando('CRIAR_AGENDAMENTO')
            if (!emailCliente || !profissionalId || !dataHora || servicosSelecionados.length === 0) {
                setErro('Preencha todos os campos para agendar.')
                return
            }

            await httpPost('agendamentos', {
                emailCliente,
                data: new Date(dataHora),
                profissional: { id: Number(profissionalId) },
                servicos: servicosSelecionados.map((id) => ({ id })),
            })

            setClienteIdSelecionado('')
            setFiltroCliente('')
            setNomeCliente('')
            setEmailCliente('')
            setTelefoneCliente('')
            setProfissionalId('')
            setDataHora('')
            setServicosSelecionados([])
            await carregarAgendamentos()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel criar o agendamento.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function atualizarStatus(id: number, status: StatusAgendamento) {
        try {
            setErro('')
            setAcaoCarregando('ATUALIZAR_STATUS')
            await httpPatch(`agendamentos/${id}/status`, { status })
            await carregarAgendamentos()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel atualizar o status.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function excluirAgendamento(id: number) {
        try {
            setErro('')
            setAcaoCarregando('EXCLUIR_AGENDAMENTO')
            await httpDelete(`agendamentos/${id}`)
            await carregarAgendamentos()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel excluir o agendamento.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function cadastrarServico() {
        try {
            setErro('')
            setAcaoCarregando('CADASTRAR_SERVICO')
            if (!novoServicoNome || !novoServicoDescricao || !novoServicoPreco) {
                setErro('Preencha nome, descricao e preco do servico.')
                return
            }

            await httpPost('servico', {
                nome: novoServicoNome,
                descricao: novoServicoDescricao,
                preco: Number(novoServicoPreco),
                qtdeSlots: Number(novoServicoSlots),
                imagemURL: novoServicoImagem,
            })

            setNovoServicoNome('')
            setNovoServicoDescricao('')
            setNovoServicoPreco('')
            setNovoServicoSlots('1')
            setNovoServicoImagem('/servicos/corte-de-cabelo.jpg')
            await carregarServicos()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel cadastrar o servico.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function excluirServico(id: number) {
        try {
            setErro('')
            setAcaoCarregando('EXCLUIR_SERVICO')
            await httpDelete(`servico/${id}`)
            await carregarServicos()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel excluir o servico.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function salvarEdicaoServico() {
        try {
            setErro('')
            setAcaoCarregando('SALVAR_SERVICO')
            if (!servicoEditandoId) return

            await httpPatch(`servico/${servicoEditandoId}`, {
                nome: servicoEdicaoNome,
                descricao: servicoEdicaoDescricao,
                preco: Number(servicoEdicaoPreco),
                qtdeSlots: Number(servicoEdicaoSlots),
                imagemURL: servicoEdicaoImagem,
            })

            setServicoEditandoId(null)
            await carregarServicos()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel editar o servico.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function salvarAgendaProfissional() {
        try {
            setErro('')
            setAcaoCarregando('SALVAR_AGENDA')
            if (erroAgendaFormulario) {
                setErro(erroAgendaFormulario)
                return
            }

            const atualizado = await httpPatch(`profissional/${profissionalAgendaId}/agenda`, {
                diasTrabalho,
                horaInicio,
                horaFim,
                tempoSlotMinutos: Number(tempoSlotMinutos),
            })

            setProfissionaisAdmin((atual) =>
                atual.map((p) => (p.id === atualizado.id ? atualizado : p))
            )
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel atualizar a agenda do barbeiro.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    if (!podeEntrarNoAdmin) {
        return (
            <div className="bg-zinc-900 min-h-screen">
                <Cabecalho titulo="Area Administrativa" descricao="Acesso restrito." />
                <div className="container py-10 text-zinc-300">Sem permissao para acessar.</div>
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
                {acaoCarregando ? (
                    <div className="bg-blue-900/30 border border-blue-700 text-blue-200 rounded px-4 py-3">
                        Processando requisicao...
                    </div>
                ) : null}

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

                {erro ? (
                    <div className="bg-red-900/40 border border-red-700 text-red-200 rounded px-4 py-3">
                        {erro}
                    </div>
                ) : null}

                {abaAtiva === 'AGENDAMENTOS' ? (
                    <>
                        <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                            <h2 className="text-xl font-bold text-zinc-100">Novo agendamento para cliente</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <input
                                    value={filtroCliente}
                                    onChange={(e) => setFiltroCliente(e.target.value)}
                                    placeholder="Buscar cliente por nome ou e-mail"
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 lg:col-span-2"
                                />

                                <select
                                    value={clienteIdSelecionado}
                                    onChange={(e) => selecionarCliente(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                >
                                    <option value="">Selecione o cliente</option>
                                    {clientesFiltrados.map((cliente) => (
                                        <option key={cliente.id} value={cliente.id}>
                                            {cliente.nome} - {cliente.email}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    value={nomeCliente}
                                    readOnly
                                    placeholder="Nome do cliente"
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-300"
                                />

                                <input
                                    value={emailCliente}
                                    readOnly
                                    placeholder="E-mail do cliente"
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-300"
                                />

                                <input
                                    value={telefoneCliente}
                                    readOnly
                                    placeholder="Telefone do cliente"
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-300"
                                />

                                <select
                                    value={profissionalId}
                                    onChange={(e) => setProfissionalId(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                >
                                    <option value="">Selecione o barbeiro</option>
                                    {profissionaisAdmin.map((p: Profissional) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nome}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="datetime-local"
                                    value={dataHora}
                                    onChange={(e) => setDataHora(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {servicos.map((s) => (
                                    <label
                                        key={s.id}
                                        className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={servicosSelecionados.includes(s.id)}
                                            onChange={() => alternarServico(s.id)}
                                        />
                                        <span>{s.nome}</span>
                                    </label>
                                ))}
                            </div>

                            <button onClick={criarAgendamento} className="button bg-green-600">
                                {acaoCarregando === 'CRIAR_AGENDAMENTO'
                                    ? 'Agendando...'
                                    : 'Agendar para cliente'}
                            </button>
                        </section>

                        <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                <h2 className="text-xl font-bold text-zinc-100">Agenda dos barbeiros</h2>
                                <div className="flex gap-2">
                                    <select
                                        value={filtroStatus}
                                        onChange={(e) => setFiltroStatus(e.target.value as any)}
                                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                    >
                                        <option value="TODOS">Todos os status</option>
                                        <option value="PENDENTE">Pendentes</option>
                                        <option value="CONFIRMADO">Confirmados</option>
                                        <option value="CANCELADO">Cancelados</option>
                                    </select>
                                    <select
                                        value={filtroProfissional}
                                        onChange={(e) => setFiltroProfissional(e.target.value)}
                                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                    >
                                        <option value="todos">Todos os barbeiros</option>
                                        {profissionaisAdmin.map((p: Profissional) => (
                                            <option key={p.id} value={p.id}>
                                                {p.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {carregando ? (
                                <p className="text-zinc-400">Carregando agenda...</p>
                            ) : agendamentos.length === 0 ? (
                                <p className="text-zinc-400">Nenhum agendamento encontrado.</p>
                            ) : (
                                <div className="space-y-3">
                                    {agendamentos.map((ag) => (
                                        <div
                                            key={ag.id}
                                            className="bg-zinc-900 border border-zinc-700 rounded p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                                        >
                                            <div>
                                                <p className="font-semibold text-zinc-100">{ag.emailCliente}</p>
                                                <p className="text-zinc-400 text-sm">
                                                    {new Date(ag.data).toLocaleString('pt-BR')} - {ag.profissional?.nome}
                                                </p>
                                                <p className="text-zinc-300 text-sm">
                                                    {ag.servicos?.map((s) => s.nome).join(', ')}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs bg-zinc-700 rounded px-2 py-1">
                                                    {STATUS_LABEL[ag.status ?? 'PENDENTE']}
                                                </span>
                                                <button
                                                    onClick={() => atualizarStatus(ag.id, 'CONFIRMADO')}
                                                    disabled={!!acaoCarregando}
                                                    className="button bg-green-700"
                                                >
                                                    Confirmar
                                                </button>
                                                <button
                                                    onClick={() => atualizarStatus(ag.id, 'CANCELADO')}
                                                    disabled={!!acaoCarregando}
                                                    className="button bg-amber-700"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => excluirAgendamento(ag.id)}
                                                    disabled={!!acaoCarregando}
                                                    className="button bg-red-700"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                ) : null}

                {abaAtiva === 'SERVICOS' ? (
                    <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                        <h2 className="text-xl font-bold text-zinc-100">Cadastro de servicos</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs uppercase text-zinc-400">Nome do servico</label>
                                <input
                                    value={novoServicoNome}
                                    onChange={(e) => setNovoServicoNome(e.target.value)}
                                    placeholder="Nome"
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs uppercase text-zinc-400">Preco</label>
                                <input
                                    value={novoServicoPreco}
                                    onChange={(e) => setNovoServicoPreco(e.target.value)}
                                    placeholder="Preco"
                                    type="number"
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs uppercase text-zinc-400">Quantidade de slots</label>
                                <input
                                    value={novoServicoSlots}
                                    onChange={(e) => setNovoServicoSlots(e.target.value)}
                                    placeholder="Quantidade de slots"
                                    type="number"
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs uppercase text-zinc-400">Imagem (URL ou Base64)</label>
                                <input
                                    value={novoServicoImagem}
                                    onChange={(e) => setNovoServicoImagem(e.target.value)}
                                    placeholder="URL da imagem"
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                />
                            </div>
                            <div className="flex flex-col gap-2 lg:col-span-2">
                                <label className="text-xs uppercase text-zinc-400">Upload da imagem</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={uploadImagemNovoServico}
                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                />
                                {carregandoUploadNovoServico ? (
                                    <p className="text-xs text-blue-300">Carregando imagem...</p>
                                ) : null}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs uppercase text-zinc-400">Descricao</label>
                            <textarea
                                value={novoServicoDescricao}
                                onChange={(e) => setNovoServicoDescricao(e.target.value)}
                                placeholder="Descricao do servico"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                            />
                        </div>

                        {novoServicoImagem ? (
                            <div className="relative h-36 w-full max-w-sm overflow-hidden rounded border border-zinc-700">
                                <Image src={novoServicoImagem} alt="Preview novo servico" fill className="object-cover" />
                            </div>
                        ) : null}

                        <button onClick={cadastrarServico} className="button bg-green-600" disabled={!!acaoCarregando}>
                            {acaoCarregando === 'CADASTRAR_SERVICO' ? 'Cadastrando...' : 'Cadastrar servico'}
                        </button>

                        {servicoEditandoId ? (
                            <div className="space-y-3 border border-zinc-700 rounded p-4 bg-zinc-900">
                                <h3 className="text-zinc-100 font-semibold">Editar servico</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs uppercase text-zinc-400">Nome do servico</label>
                                        <input
                                            value={servicoEdicaoNome}
                                            onChange={(e) => setServicoEdicaoNome(e.target.value)}
                                            placeholder="Nome"
                                            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs uppercase text-zinc-400">Preco</label>
                                        <input
                                            value={servicoEdicaoPreco}
                                            onChange={(e) => setServicoEdicaoPreco(e.target.value)}
                                            type="number"
                                            placeholder="Preco"
                                            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs uppercase text-zinc-400">Quantidade de slots</label>
                                        <input
                                            value={servicoEdicaoSlots}
                                            onChange={(e) => setServicoEdicaoSlots(e.target.value)}
                                            type="number"
                                            placeholder="Quantidade de slots"
                                            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs uppercase text-zinc-400">Imagem (URL ou Base64)</label>
                                        <input
                                            value={servicoEdicaoImagem}
                                            onChange={(e) => setServicoEdicaoImagem(e.target.value)}
                                            placeholder="URL da imagem"
                                            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 lg:col-span-2">
                                        <label className="text-xs uppercase text-zinc-400">Upload da imagem</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={uploadImagemEdicaoServico}
                                            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
                                        />
                                        {carregandoUploadEdicaoServico ? (
                                            <p className="text-xs text-blue-300">Carregando imagem...</p>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs uppercase text-zinc-400">Descricao</label>
                                    <textarea
                                        value={servicoEdicaoDescricao}
                                        onChange={(e) => setServicoEdicaoDescricao(e.target.value)}
                                        placeholder="Descricao do servico"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
                                    />
                                </div>

                                {servicoEdicaoImagem ? (
                                    <div className="relative h-36 w-full max-w-sm overflow-hidden rounded border border-zinc-700">
                                        <Image src={servicoEdicaoImagem} alt="Preview edicao servico" fill className="object-cover" />
                                    </div>
                                ) : null}

                                <div className="flex gap-2">
                                    <button
                                        onClick={salvarEdicaoServico}
                                        className="button bg-blue-700"
                                        disabled={!!acaoCarregando}
                                    >
                                        {acaoCarregando === 'SALVAR_SERVICO'
                                            ? 'Salvando...'
                                            : 'Salvar edicao'}
                                    </button>
                                    <button
                                        onClick={() => setServicoEditandoId(null)}
                                        className="button bg-zinc-700"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="space-y-2">
                            {servicos.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                >
                                    <div>
                                        <p className="font-semibold text-zinc-100">{s.nome}</p>
                                        <p className="text-zinc-400 text-sm">R$ {s.preco},00</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => iniciarEdicaoServico(s)}
                                            disabled={!!acaoCarregando}
                                            className="button bg-blue-700"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => excluirServico(s.id)}
                                            disabled={!!acaoCarregando}
                                            className="button bg-red-700"
                                        >
                                            {acaoCarregando === 'EXCLUIR_SERVICO' ? 'Excluindo...' : 'Excluir'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                {abaAtiva === 'BARBEIROS' ? (
                    <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-xl font-bold text-zinc-100">Gestao de barbeiros</h2>
                            {usuario?.role === 'DONO' ? (
                                <button onClick={abrirModalNovoBarbeiro} className="button bg-green-600" disabled={!!acaoCarregando}>
                                    Novo barbeiro
                                </button>
                            ) : null}
                        </div>

                        {usuario?.role !== 'DONO' ? (
                            <p className="text-amber-300 text-sm">
                                Somente o dono pode gerenciar barbeiros.
                            </p>
                        ) : null}

                        <input
                            value={filtroBarbeiros}
                            onChange={(e) => setFiltroBarbeiros(e.target.value)}
                            placeholder="Buscar barbeiro por nome, e-mail ou profissional"
                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                        />

                        <div className="flex gap-2">
                            <button
                                className={`button ${visualizacaoBarbeiros === 'ATIVOS' ? 'bg-blue-700' : 'bg-zinc-700'}`}
                                onClick={() => setVisualizacaoBarbeiros('ATIVOS')}
                            >
                                Ativos
                            </button>
                            <button
                                className={`button ${visualizacaoBarbeiros === 'INATIVOS' ? 'bg-blue-700' : 'bg-zinc-700'}`}
                                onClick={() => setVisualizacaoBarbeiros('INATIVOS')}
                            >
                                Inativos
                            </button>
                        </div>

                        {barbeirosFiltrados.length === 0 ? (
                            <p className="text-zinc-400">
                                {visualizacaoBarbeiros === 'ATIVOS'
                                    ? 'Nenhum barbeiro ativo cadastrado.'
                                    : 'Nenhum barbeiro inativo encontrado.'}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {barbeirosPaginados.map((barbeiro) => (
                                    <div
                                        key={barbeiro.id}
                                        className="bg-zinc-900 border border-zinc-700 rounded p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                                    >
                                        <div>
                                            <p className="font-semibold text-zinc-100">{barbeiro.nome}</p>
                                            <p className="text-zinc-400 text-sm">{barbeiro.email}</p>
                                            <p className="text-zinc-500 text-sm">{mascararTelefone(barbeiro.telefone ?? '') || 'Sem telefone'}</p>
                                            <p className="text-zinc-300 text-sm">Profissional: {barbeiro.profissional?.nome ?? 'Nao vinculado'}</p>
                                        </div>
                                        {usuario?.role === 'DONO' ? (
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => abrirModalEditarBarbeiro(barbeiro)}
                                                    disabled={!!acaoCarregando}
                                                    className="button bg-blue-700"
                                                >
                                                    Editar
                                                </button>
                                                {visualizacaoBarbeiros === 'ATIVOS' ? (
                                                    <button
                                                        onClick={() => {
                                                            setBarbeiroPendenteInativacao(barbeiro)
                                                            setConfirmacaoNomeInativacao('')
                                                        }}
                                                        disabled={!!acaoCarregando}
                                                        className="button bg-red-700"
                                                    >
                                                        {acaoCarregando === 'INATIVAR_BARBEIRO' ? 'Inativando...' : 'Inativar'}
                                                    </button>
                                                ) : null}
                                                {visualizacaoBarbeiros === 'INATIVOS' ? (
                                                    <button
                                                        onClick={() => reativarBarbeiro(barbeiro.id)}
                                                        disabled={!!acaoCarregando}
                                                        className="button bg-emerald-700"
                                                    >
                                                        {acaoCarregando === 'REATIVAR_BARBEIRO' ? 'Reativando...' : 'Reativar'}
                                                    </button>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}

                        {barbeirosFiltrados.length > 0 ? (
                            <div className="flex items-center justify-between gap-3 text-sm text-zinc-300">
                                <span>
                                    Pagina {paginaBarbeiros} de {totalPaginasBarbeiros}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        className="button bg-zinc-700"
                                        disabled={paginaBarbeiros <= 1}
                                        onClick={() => setPaginaBarbeiros((p) => Math.max(1, p - 1))}
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        className="button bg-zinc-700"
                                        disabled={paginaBarbeiros >= totalPaginasBarbeiros}
                                        onClick={() =>
                                            setPaginaBarbeiros((p) => Math.min(totalPaginasBarbeiros, p + 1))
                                        }
                                    >
                                        Proxima
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {barbeiroPendenteInativacao ? (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                                <div className="w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                                    <h3 className="text-lg font-bold text-zinc-100">Confirmar inativacao</h3>
                                    <p className="text-zinc-300">
                                        Deseja realmente inativar o barbeiro{' '}
                                        <span className="font-semibold">{barbeiroPendenteInativacao.nome}</span>?
                                    </p>
                                    <p className="text-zinc-400 text-sm">
                                        Para confirmar, digite exatamente o nome do barbeiro abaixo.
                                    </p>
                                    <input
                                        value={confirmacaoNomeInativacao}
                                        onChange={(e) => setConfirmacaoNomeInativacao(e.target.value)}
                                        placeholder={barbeiroPendenteInativacao.nome}
                                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            className="button bg-zinc-700"
                                            onClick={() => {
                                                setBarbeiroPendenteInativacao(null)
                                                setConfirmacaoNomeInativacao('')
                                            }}
                                            disabled={!!acaoCarregando}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            className="button bg-red-700"
                                            onClick={() => inativarBarbeiro(barbeiroPendenteInativacao.id)}
                                            disabled={
                                                !!acaoCarregando ||
                                                confirmacaoNomeInativacao.trim() !==
                                                barbeiroPendenteInativacao.nome.trim()
                                            }
                                        >
                                            {acaoCarregando === 'INATIVAR_BARBEIRO' ? 'Inativando...' : 'Confirmar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {modalBarbeiroAberto ? (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                                <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-zinc-100">
                                            {barbeiroEditandoId ? 'Editar barbeiro' : 'Cadastrar barbeiro'}
                                        </h3>
                                        <button
                                            className="button bg-zinc-700"
                                            onClick={() => {
                                                setModalBarbeiroAberto(false)
                                                limparFormularioBarbeiro()
                                            }}
                                        >
                                            Fechar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs uppercase text-zinc-400">Nome do barbeiro</label>
                                            <input
                                                value={nomeBarbeiro}
                                                onChange={(e) => setNomeBarbeiro(e.target.value)}
                                                placeholder="Nome do barbeiro"
                                                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs uppercase text-zinc-400">E-mail do barbeiro</label>
                                            <input
                                                type="email"
                                                value={emailBarbeiro}
                                                onChange={(e) => setEmailBarbeiro(e.target.value)}
                                                placeholder="email@dominio.com"
                                                className={`bg-zinc-900 border rounded px-3 py-2 ${erroEmailBarbeiro ? 'border-red-500' : 'border-zinc-700'}`}
                                            />
                                            {erroEmailBarbeiro ? (
                                                <p className="text-xs text-red-400">Informe um e-mail valido.</p>
                                            ) : null}
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs uppercase text-zinc-400">Telefone do barbeiro</label>
                                            <input
                                                value={telefoneBarbeiro}
                                                onChange={(e) => setTelefoneBarbeiro(mascararTelefone(e.target.value))}
                                                placeholder="(11) 99999-9999"
                                                className={`bg-zinc-900 border rounded px-3 py-2 ${erroTelefoneBarbeiro ? 'border-red-500' : 'border-zinc-700'}`}
                                            />
                                            {erroTelefoneBarbeiro ? (
                                                <p className="text-xs text-red-400">Telefone invalido. Informe DDD + numero.</p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="border-t border-zinc-700 pt-4 space-y-4">
                                        <h4 className="text-zinc-100 font-semibold">Dados do profissional</h4>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs uppercase text-zinc-400">Nome de exibicao</label>
                                                <input
                                                    value={nomeProfissionalCadastro}
                                                    onChange={(e) => setNomeProfissionalCadastro(e.target.value)}
                                                    placeholder="Ex.: Neto Maos de Fada"
                                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs uppercase text-zinc-400">Imagem (URL)</label>
                                                <input
                                                    value={imagemProfissionalCadastro}
                                                    onChange={(e) => setImagemProfissionalCadastro(e.target.value)}
                                                    placeholder="/profissionais/profissional-x.jpg"
                                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-2 lg:col-span-2">
                                                <label className="text-xs uppercase text-zinc-400">Upload da imagem</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={uploadImagemProfissional}
                                                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                                />
                                                {carregandoUploadProfissionalCadastro ? (
                                                    <p className="text-xs text-blue-300">Carregando imagem...</p>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs uppercase text-zinc-400">Descricao do profissional</label>
                                            <textarea
                                                value={descricaoProfissionalCadastro}
                                                onChange={(e) => setDescricaoProfissionalCadastro(e.target.value)}
                                                placeholder="Descricao do barbeiro para exibicao no site"
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                            />
                                        </div>

                                        {imagemProfissionalCadastro ? (
                                            <div className="relative h-36 w-full max-w-sm overflow-hidden rounded border border-zinc-700">
                                                <Image
                                                    src={imagemProfissionalCadastro}
                                                    alt="Preview profissional"
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : null}
                                    </div>

                                    <button
                                        onClick={barbeiroEditandoId ? salvarEdicaoBarbeiro : cadastrarBarbeiroCompleto}
                                        disabled={!!acaoCarregando || carregandoUploadProfissionalCadastro || erroEmailBarbeiro || erroTelefoneBarbeiro}
                                        className={`button ${!!acaoCarregando || carregandoUploadProfissionalCadastro || erroEmailBarbeiro || erroTelefoneBarbeiro
                                            ? 'bg-zinc-600 cursor-not-allowed'
                                            : 'bg-green-600'
                                            }`}
                                    >
                                        {barbeiroEditandoId
                                            ? acaoCarregando === 'EDITAR_BARBEIRO'
                                                ? 'Salvando barbeiro...'
                                                : 'Salvar alteracoes'
                                            : acaoCarregando === 'CADASTRAR_BARBEIRO'
                                                ? 'Cadastrando barbeiro...'
                                                : 'Cadastrar barbeiro'}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </section>
                ) : null}

                {abaAtiva === 'AGENDA' ? (
                    <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                        <h2 className="text-xl font-bold text-zinc-100">Agenda por barbeiro</h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <select
                                value={profissionalAgendaId}
                                onChange={(e) => setProfissionalAgendaId(e.target.value)}
                                disabled={usuario?.role === 'BARBEIRO'}
                                className={`bg-zinc-900 border rounded px-3 py-2 disabled:opacity-70 ${erroProfissionalAgenda ? 'border-red-500' : 'border-zinc-700'}`}
                            >
                                <option value="">Selecione o barbeiro</option>
                                {profissionaisPermitidosAgenda.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nome}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="number"
                                min={5}
                                max={120}
                                value={tempoSlotMinutos}
                                onChange={(e) => setTempoSlotMinutos(e.target.value)}
                                className={`bg-zinc-900 border rounded px-3 py-2 ${erroTempoSlot ? 'border-red-500' : 'border-zinc-700'}`}
                                placeholder="Tempo por slot (min)"
                            />

                            <input
                                type="time"
                                value={horaInicio}
                                onChange={(e) => setHoraInicio(e.target.value)}
                                className={`bg-zinc-900 border rounded px-3 py-2 ${erroHoraInicio || erroJanelaHora ? 'border-red-500' : 'border-zinc-700'}`}
                            />
                            <input
                                type="time"
                                value={horaFim}
                                onChange={(e) => setHoraFim(e.target.value)}
                                className={`bg-zinc-900 border rounded px-3 py-2 ${erroHoraFimFormato || erroJanelaHora ? 'border-red-500' : 'border-zinc-700'}`}
                            />
                        </div>

                        <div className="space-y-1 text-xs">
                            {erroProfissionalAgenda ? <p className="text-red-400">Selecione um barbeiro.</p> : null}
                            {erroTempoSlot ? <p className="text-red-400">Tempo por slot deve ser inteiro entre 5 e 120.</p> : null}
                            {erroHoraInicio || erroHoraFimFormato ? (
                                <p className="text-red-400">Preencha hora inicio e fim em HH:mm.</p>
                            ) : null}
                            {erroJanelaHora ? <p className="text-red-400">Hora fim deve ser maior que hora inicio.</p> : null}
                        </div>

                        <div className={`flex flex-wrap gap-2 rounded ${erroDiasTrabalho ? 'p-2 border border-red-500' : ''}`}>
                            {DIAS_SEMANA.map((dia) => (
                                <button
                                    key={dia.valor}
                                    onClick={() => alternarDia(dia.valor)}
                                    className={`px-3 py-2 rounded border ${diasTrabalho.includes(dia.valor)
                                        ? 'bg-green-600 text-white border-green-500'
                                        : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                                        }`}
                                >
                                    {dia.label}
                                </button>
                            ))}
                        </div>

                        {erroDiasTrabalho ? (
                            <p className="text-xs text-red-400">Selecione ao menos um dia de trabalho.</p>
                        ) : null}

                        {erroAgendaFormulario ? (
                            <p className="text-sm text-amber-300">{erroAgendaFormulario}</p>
                        ) : (
                            <p className="text-sm text-green-300">Agenda pronta para salvar.</p>
                        )}

                        <button
                            onClick={salvarAgendaProfissional}
                            disabled={!!erroAgendaFormulario}
                            className={`button ${erroAgendaFormulario ? 'bg-zinc-600 cursor-not-allowed' : 'bg-green-600'}`}
                        >
                            {acaoCarregando === 'SALVAR_AGENDA'
                                ? 'Salvando agenda...'
                                : 'Salvar agenda do barbeiro'}
                        </button>
                    </section>
                ) : null}
            </div>
        </div>
    )
}
