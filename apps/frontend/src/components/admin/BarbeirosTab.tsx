'use client'

import { useEffect, useMemo, useState } from 'react'
import { Profissional, Usuario } from '@neto-bastos/core'
import Image from 'next/image'
import useAPI from '@/data/hooks/useAPI'
import { resolverImagemUrl } from '@/lib/imagem'
import {
    BarbeiroAdmin,
    ClienteAdmin,
    EMAIL_REGEX,
    RolePerfil,
    TAMANHO_PAGINA_BARBEIROS,
    mascararTelefone,
    obterTokenLocal,
} from './adminShared'

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE

export interface BarbeirosTabProps {
    profissionaisAdmin: Profissional[]
    usuario: Usuario | null
    onProfissionalCriado: () => void
}

type AcaoCarregando =
    | 'CADASTRAR_BARBEIRO'
    | 'EDITAR_BARBEIRO'
    | 'INATIVAR_BARBEIRO'
    | 'REATIVAR_BARBEIRO'
    | 'ALTERAR_PERFIL'
    | null

type VisualizacaoBarbeiros = 'ATIVOS' | 'INATIVOS'

export default function BarbeirosTab(props: BarbeirosTabProps) {
    const { profissionaisAdmin, usuario, onProfissionalCriado } = props
    const { httpGet, httpPost, httpPatch } = useAPI()
    const ehDono = usuario?.role === 'DONO'

    const [clientes, setClientes] = useState<ClienteAdmin[]>([])
    const [barbeiros, setBarbeiros] = useState<BarbeiroAdmin[]>([])
    const [barbeirosInativos, setBarbeirosInativos] = useState<BarbeiroAdmin[]>([])
    const [erroBarbeiros, setErroBarbeiros] = useState('')
    const [erro, setErro] = useState('')
    const [acaoCarregando, setAcaoCarregando] = useState<AcaoCarregando>(null)

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
    const [perfilCadastro, setPerfilCadastro] = useState<'BARBEIRO' | 'DONO' | 'FUNCIONARIO'>('BARBEIRO')
    const [modoProfissional, setModoProfissional] = useState<'EXISTENTE' | 'NOVO'>('NOVO')
    const [profissionalVinculadoId, setProfissionalVinculadoId] = useState('')
    const [filtroBarbeiros, setFiltroBarbeiros] = useState('')
    const [paginaBarbeiros, setPaginaBarbeiros] = useState(1)
    const [barbeiroPendenteInativacao, setBarbeiroPendenteInativacao] = useState<BarbeiroAdmin | null>(null)
    const [visualizacaoBarbeiros, setVisualizacaoBarbeiros] = useState<VisualizacaoBarbeiros>('ATIVOS')
    const [confirmacaoNomeInativacao, setConfirmacaoNomeInativacao] = useState('')

    const [usuarioPerfilId, setUsuarioPerfilId] = useState('')
    const [rolePerfilSelecionado, setRolePerfilSelecionado] = useState<RolePerfil>('CLIENTE')
    const [profissionalPerfilId, setProfissionalPerfilId] = useState('')

    const perfilExigeProfissional = perfilCadastro === 'BARBEIRO' || perfilCadastro === 'DONO'
    const rolePerfilExigeProfissional = rolePerfilSelecionado === 'BARBEIRO' || rolePerfilSelecionado === 'DONO'

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

    const usuariosGerenciaveis = useMemo(() => {
        const mapa = new Map<number, { id: number; nome: string; email: string; role: RolePerfil }>()
        clientes.forEach((c) => mapa.set(c.id, { id: c.id, nome: c.nome, email: c.email, role: 'CLIENTE' }))
        barbeiros.forEach((b) => mapa.set(b.id, { id: b.id, nome: b.nome, email: b.email, role: b.role }))
        barbeirosInativos.forEach((b) => mapa.set(b.id, { id: b.id, nome: b.nome, email: b.email, role: b.role }))
        return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome))
    }, [clientes, barbeiros, barbeirosInativos])

    async function carregarClientes() {
        try {
            const data = await httpGet('auth/clientes')
            setClientes(data ?? [])
        } catch {
            setClientes([])
        }
    }

    async function carregarBarbeiros() {
        try {
            const data = await httpGet('auth/barbeiros')
            setBarbeiros(data ?? [])
            setErroBarbeiros('')
        } catch (e: any) {
            // Usuarios sem permissao (ex.: BARBEIRO) nao devem quebrar o carregamento da aba.
            setBarbeiros([])
            setErroBarbeiros(e?.message ?? 'Nao foi possivel carregar os barbeiros.')
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

    useEffect(() => {
        if (ehDono) {
            carregarClientes()
            carregarBarbeiros()
            carregarBarbeirosInativos()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ehDono])

    useEffect(() => {
        setPaginaBarbeiros(1)
    }, [filtroBarbeiros, visualizacaoBarbeiros])

    useEffect(() => {
        if (paginaBarbeiros > totalPaginasBarbeiros) {
            setPaginaBarbeiros(totalPaginasBarbeiros)
        }
    }, [paginaBarbeiros, totalPaginasBarbeiros])

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

    function limparFormularioBarbeiro() {
        setNomeBarbeiro('')
        setEmailBarbeiro('')
        setTelefoneBarbeiro('')
        setNomeProfissionalCadastro('')
        setDescricaoProfissionalCadastro('')
        setImagemProfissionalCadastro('/profissionais/profissional-1.jpg')
        setBarbeiroEditandoId(null)
        setProfissionalEditandoId(null)
        setPerfilCadastro('BARBEIRO')
        setModoProfissional('NOVO')
        setProfissionalVinculadoId('')
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

    async function cadastrarBarbeiroCompleto() {
        try {
            setErro('')
            setAcaoCarregando('CADASTRAR_BARBEIRO')

            if (!nomeBarbeiro || !emailBarbeiro) {
                setErro('Preencha nome e e-mail.')
                return
            }

            if (!EMAIL_REGEX.test(emailBarbeiroNormalizado)) {
                setErro('Informe um e-mail valido.')
                return
            }

            if (erroTelefoneBarbeiro) {
                setErro('Telefone invalido. Use 10 ou 11 digitos com DDD.')
                return
            }

            const payload: any = {
                nome: nomeBarbeiro,
                email: emailBarbeiroNormalizado,
                telefone: telefoneBarbeiroDigitos || undefined,
                role: perfilCadastro,
            }

            if (perfilExigeProfissional) {
                if (modoProfissional === 'EXISTENTE') {
                    if (!profissionalVinculadoId) {
                        setErro('Selecione um profissional para vincular.')
                        return
                    }
                    payload.profissionalId = Number(profissionalVinculadoId)
                } else {
                    if (
                        !nomeProfissionalCadastro ||
                        !descricaoProfissionalCadastro ||
                        !imagemProfissionalCadastro
                    ) {
                        setErro('Preencha os dados do novo profissional.')
                        return
                    }
                    payload.novoProfissional = {
                        nome: nomeProfissionalCadastro,
                        descricao: descricaoProfissionalCadastro,
                        imagemUrl: imagemProfissionalCadastro,
                    }
                }
            }

            await httpPost('auth/barbeiros', payload)

            limparFormularioBarbeiro()
            setModalBarbeiroAberto(false)
            onProfissionalCriado()
            await Promise.all([carregarBarbeiros(), carregarClientes()])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel cadastrar.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    async function salvarEdicaoBarbeiro() {
        if (!barbeiroEditandoId) {
            setErro('Colaborador selecionado para edicao e invalido.')
            return
        }

        try {
            setErro('')
            setAcaoCarregando('EDITAR_BARBEIRO')

            if (!nomeBarbeiro || !emailBarbeiro) {
                setErro('Preencha nome e e-mail.')
                return
            }

            if (!EMAIL_REGEX.test(emailBarbeiroNormalizado)) {
                setErro('Informe um e-mail valido.')
                return
            }

            if (erroTelefoneBarbeiro) {
                setErro('Telefone invalido. Use 10 ou 11 digitos com DDD.')
                return
            }

            if (profissionalEditandoId) {
                await httpPatch(`profissional/${profissionalEditandoId}`, {
                    nome: nomeProfissionalCadastro,
                    descricao: descricaoProfissionalCadastro,
                    imagemUrl: imagemProfissionalCadastro,
                })
            }

            await httpPatch(`auth/barbeiros/${barbeiroEditandoId}`, {
                nome: nomeBarbeiro,
                email: emailBarbeiroNormalizado,
                telefone: telefoneBarbeiroDigitos || undefined,
            })

            limparFormularioBarbeiro()
            setModalBarbeiroAberto(false)
            onProfissionalCriado()
            await carregarBarbeiros()
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel editar colaborador.')
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

    function selecionarUsuarioPerfil(id: string) {
        setUsuarioPerfilId(id)
        const alvo = usuariosGerenciaveis.find((u) => String(u.id) === id)
        setRolePerfilSelecionado(alvo?.role ?? 'CLIENTE')
        setProfissionalPerfilId('')
    }

    async function salvarPerfilUsuario() {
        try {
            setErro('')
            setAcaoCarregando('ALTERAR_PERFIL')

            if (!usuarioPerfilId) {
                setErro('Selecione um usuario para alterar o perfil.')
                return
            }

            if (rolePerfilExigeProfissional && !profissionalPerfilId) {
                setErro('Selecione um profissional para vincular ao novo perfil.')
                return
            }

            await httpPatch(`auth/usuarios/${usuarioPerfilId}/role`, {
                role: rolePerfilSelecionado,
                profissionalId: rolePerfilExigeProfissional ? Number(profissionalPerfilId) : null,
            })

            setUsuarioPerfilId('')
            setRolePerfilSelecionado('CLIENTE')
            setProfissionalPerfilId('')
            await Promise.all([carregarClientes(), carregarBarbeiros(), carregarBarbeirosInativos()])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel alterar o perfil do usuario.')
        } finally {
            setAcaoCarregando(null)
        }
    }

    if (!ehDono) {
        return (
            <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                <h2 className="text-xl font-bold text-zinc-100">Gestao de barbeiros</h2>
                <p className="text-amber-300 text-sm">Somente o dono pode gerenciar barbeiros.</p>
                {erroBarbeiros ? <p className="text-red-400 text-sm">{erroBarbeiros}</p> : null}
            </section>
        )
    }

    return (
        <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-zinc-100">Gestao de barbeiros</h2>
                <button onClick={abrirModalNovoBarbeiro} className="button bg-green-600" disabled={!!acaoCarregando}>
                    Novo barbeiro
                </button>
            </div>

            {erro ? (
                <div className="bg-red-900/40 border border-red-700 text-red-200 rounded px-4 py-3">
                    {erro}
                </div>
            ) : null}

            {erroBarbeiros ? <p className="text-red-400 text-sm">{erroBarbeiros}</p> : null}

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

            <div className="border-t border-zinc-700 pt-4 space-y-4">
                <h3 className="text-lg font-bold text-zinc-100">Alterar perfil de um usuario</h3>
                <p className="text-xs text-zinc-400">
                    Use esta opcao para corrigir ou ajustar o perfil de um usuario existente (cliente, funcionario, barbeiro ou dono).
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <select
                        value={usuarioPerfilId}
                        onChange={(e) => selecionarUsuarioPerfil(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                    >
                        <option value="">Selecione o usuario</option>
                        {usuariosGerenciaveis.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.nome} - {u.email}
                            </option>
                        ))}
                    </select>

                    <select
                        value={rolePerfilSelecionado}
                        onChange={(e) => setRolePerfilSelecionado(e.target.value as RolePerfil)}
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                    >
                        <option value="CLIENTE">Cliente</option>
                        <option value="FUNCIONARIO">Funcionario</option>
                        <option value="BARBEIRO">Barbeiro</option>
                        <option value="DONO">Dono</option>
                    </select>

                    {rolePerfilExigeProfissional ? (
                        <select
                            value={profissionalPerfilId}
                            onChange={(e) => setProfissionalPerfilId(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                        >
                            <option value="">Selecione o profissional</option>
                            {profissionaisAdmin.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.nome}
                                </option>
                            ))}
                        </select>
                    ) : null}
                </div>

                <button
                    onClick={salvarPerfilUsuario}
                    disabled={!!acaoCarregando || !usuarioPerfilId}
                    className="button bg-blue-700"
                >
                    {acaoCarregando === 'ALTERAR_PERFIL' ? 'Salvando...' : 'Salvar perfil'}
                </button>
            </div>

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
                                {barbeiroEditandoId ? 'Editar colaborador' : 'Cadastrar colaborador'}
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

                        {!barbeiroEditandoId ? (
                            <div className="border-t border-zinc-700 pt-4 space-y-2">
                                <label className="text-xs uppercase text-zinc-400">Perfil</label>
                                <div className="flex flex-wrap gap-2">
                                    {(['BARBEIRO', 'FUNCIONARIO', 'DONO'] as const).map((perfil) => (
                                        <button
                                            key={perfil}
                                            type="button"
                                            onClick={() => setPerfilCadastro(perfil)}
                                            className={`button ${perfilCadastro === perfil ? 'bg-blue-700' : 'bg-zinc-700'}`}
                                        >
                                            {perfil === 'BARBEIRO' ? 'Barbeiro' : perfil === 'FUNCIONARIO' ? 'Funcionario' : 'Dono'}
                                        </button>
                                    ))}
                                </div>
                                {perfilCadastro === 'FUNCIONARIO' ? (
                                    <p className="text-xs text-zinc-400">Funcionario tem acesso limitado (apenas visualiza agendamentos) e nao precisa de profissional.</p>
                                ) : null}
                            </div>
                        ) : null}

                        {barbeiroEditandoId || perfilExigeProfissional ? (
                            <div className="border-t border-zinc-700 pt-4 space-y-4">
                                <h4 className="text-zinc-100 font-semibold">Profissional</h4>

                                {!barbeiroEditandoId ? (
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setModoProfissional('NOVO')}
                                            className={`button ${modoProfissional === 'NOVO' ? 'bg-blue-700' : 'bg-zinc-700'}`}
                                        >
                                            Criar novo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setModoProfissional('EXISTENTE')}
                                            className={`button ${modoProfissional === 'EXISTENTE' ? 'bg-blue-700' : 'bg-zinc-700'}`}
                                        >
                                            Vincular existente
                                        </button>
                                    </div>
                                ) : null}

                                {!barbeiroEditandoId && modoProfissional === 'EXISTENTE' ? (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs uppercase text-zinc-400">Profissional existente</label>
                                        <select
                                            value={profissionalVinculadoId}
                                            onChange={(e) => setProfissionalVinculadoId(e.target.value)}
                                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
                                        >
                                            <option value="">Selecione o profissional</option>
                                            {profissionaisAdmin.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <>
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
                                                    src={resolverImagemUrl(imagemProfissionalCadastro)}
                                                    alt="Preview profissional"
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        ) : null}

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
                                    ? 'Salvando...'
                                    : 'Salvar alteracoes'
                                : acaoCarregando === 'CADASTRAR_BARBEIRO'
                                    ? 'Cadastrando...'
                                    : 'Cadastrar colaborador'}
                        </button>
                    </div>
                </div>
            ) : null}
        </section>
    )
}
