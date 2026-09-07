'use client'

import { useEffect, useState } from 'react'
import { Servico } from '@neto-bastos/core'
import Image from 'next/image'
import useAPI from '@/data/hooks/useAPI'
import { resolverImagemUrl } from '@/lib/imagem'
import { obterTokenLocal } from './adminShared'

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE

type AcaoCarregando = 'CADASTRAR_SERVICO' | 'EXCLUIR_SERVICO' | 'SALVAR_SERVICO' | null

export default function ServicosTab() {
    const { httpGet, httpPost, httpPatch, httpDelete } = useAPI()

    const [servicos, setServicos] = useState<Servico[]>([])
    const [carregando, setCarregando] = useState(true)
    const [acaoCarregando, setAcaoCarregando] = useState<AcaoCarregando>(null)
    const [erro, setErro] = useState('')

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

    const [carregandoUploadNovoServico, setCarregandoUploadNovoServico] = useState(false)
    const [carregandoUploadEdicaoServico, setCarregandoUploadEdicaoServico] = useState(false)

    async function carregarServicos() {
        try {
            setCarregando(true)
            setErro('')
            const data = await httpGet('servico')
            setServicos(data ?? [])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel carregar os servicos.')
        } finally {
            setCarregando(false)
        }
    }

    useEffect(() => {
        carregarServicos()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function iniciarEdicaoServico(servico: Servico) {
        setServicoEditandoId(servico.id)
        setServicoEdicaoNome(servico.nome)
        setServicoEdicaoDescricao(servico.descricao)
        setServicoEdicaoPreco(String(servico.preco))
        setServicoEdicaoSlots(String(servico.qtdeSlots))
        setServicoEdicaoImagem(servico.imagemURL)
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

    return (
        <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
            <h2 className="text-xl font-bold text-zinc-100">Cadastro de servicos</h2>

            {erro ? (
                <div className="bg-red-900/40 border border-red-700 text-red-200 rounded px-4 py-3">
                    {erro}
                </div>
            ) : null}

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
                    <Image
                        src={resolverImagemUrl(novoServicoImagem)}
                        alt="Preview novo servico"
                        fill
                        className="object-cover"
                    />
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
                            <Image
                                src={resolverImagemUrl(servicoEdicaoImagem)}
                                alt="Preview edicao servico"
                                fill
                                className="object-cover"
                            />
                        </div>
                    ) : null}

                    <div className="flex gap-2">
                        <button
                            onClick={salvarEdicaoServico}
                            className="button bg-blue-700"
                            disabled={!!acaoCarregando}
                        >
                            {acaoCarregando === 'SALVAR_SERVICO' ? 'Salvando...' : 'Salvar edicao'}
                        </button>
                        <button onClick={() => setServicoEditandoId(null)} className="button bg-zinc-700">
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : null}

            <div className="space-y-2">
                {carregando ? (
                    <p className="text-zinc-400">Carregando servicos...</p>
                ) : (
                    servicos.map((s) => (
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
                    ))
                )}
            </div>
        </section>
    )
}
