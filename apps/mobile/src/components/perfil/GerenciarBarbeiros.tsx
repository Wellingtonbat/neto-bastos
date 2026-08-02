import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import useAPI from '@/src/data/hooks/useAPI'

type BarbeiroAdmin = {
    id: number
    nome: string
    email: string
    telefone?: string | null
    profissional?: {
        id: number
        nome: string
        descricao: string
        imagemUrl: string
    } | null
}

type VisualizacaoBarbeiros = 'ATIVOS' | 'INATIVOS'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const TAMANHO_PAGINA = 5
const URL_API = 'http://localhost:3001'

function mascararTelefone(valor: string) {
    const digitos = valor.replace(/\D/g, '').slice(0, 11)

    if (digitos.length <= 2) return digitos
    if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
    if (digitos.length <= 10) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
    }
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

export default function GerenciarBarbeiros() {
    const { httpGet, httpPatch, httpPost, httpPostFormData } = useAPI()

    const [barbeiros, setBarbeiros] = useState<BarbeiroAdmin[]>([])
    const [barbeirosInativos, setBarbeirosInativos] = useState<BarbeiroAdmin[]>([])
    const [erro, setErro] = useState('')
    const [carregando, setCarregando] = useState(false)
    const [carregandoUploadImagem, setCarregandoUploadImagem] = useState(false)

    const [modalAberto, setModalAberto] = useState(false)
    const [barbeiroEditandoId, setBarbeiroEditandoId] = useState<number | null>(null)
    const [profissionalEditandoId, setProfissionalEditandoId] = useState<number | null>(null)
    const [filtroBarbeiros, setFiltroBarbeiros] = useState('')
    const [paginaAtual, setPaginaAtual] = useState(1)
    const [visualizacaoBarbeiros, setVisualizacaoBarbeiros] = useState<VisualizacaoBarbeiros>('ATIVOS')

    const [nomeBarbeiro, setNomeBarbeiro] = useState('')
    const [emailBarbeiro, setEmailBarbeiro] = useState('')
    const [telefoneBarbeiro, setTelefoneBarbeiro] = useState('')
    const [nomeProfissional, setNomeProfissional] = useState('')
    const [descricaoProfissional, setDescricaoProfissional] = useState('')
    const [imagemProfissional, setImagemProfissional] = useState('/profissionais/profissional-1.jpg')

    const emailNormalizado = emailBarbeiro.trim().toLowerCase()
    const telefoneDigitos = telefoneBarbeiro.replace(/\D/g, '')

    const erroEmail = useMemo(() => {
        return emailBarbeiro.trim().length > 0 && !EMAIL_REGEX.test(emailNormalizado)
    }, [emailBarbeiro, emailNormalizado])

    const erroTelefone = useMemo(() => {
        return (
            telefoneBarbeiro.trim().length > 0 &&
            telefoneDigitos.length !== 10 &&
            telefoneDigitos.length !== 11
        )
    }, [telefoneBarbeiro, telefoneDigitos.length])

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

    const totalPaginas = Math.max(1, Math.ceil(barbeirosFiltrados.length / TAMANHO_PAGINA))

    const barbeirosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * TAMANHO_PAGINA
        const fim = inicio + TAMANHO_PAGINA
        return barbeirosFiltrados.slice(inicio, fim)
    }, [barbeirosFiltrados, paginaAtual])

    const imagemPreviewProfissional = useMemo(() => {
        if (!imagemProfissional) return ''
        if (imagemProfissional.startsWith('http://') || imagemProfissional.startsWith('https://')) {
            return imagemProfissional
        }
        return `${URL_API}${imagemProfissional}`
    }, [imagemProfissional])

    const carregarBarbeiros = useCallback(async () => {
        try {
            setCarregando(true)
            setErro('')
            const data = await httpGet('auth/barbeiros')
            setBarbeiros(data ?? [])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel carregar os barbeiros.')
        } finally {
            setCarregando(false)
        }
    }, [httpGet])

    const carregarBarbeirosInativos = useCallback(async () => {
        try {
            const data = await httpGet('auth/barbeiros/inativos')
            setBarbeirosInativos(data ?? [])
        } catch {
            setBarbeirosInativos([])
        }
    }, [httpGet])

    useEffect(() => {
        carregarBarbeiros()
        carregarBarbeirosInativos()
    }, [carregarBarbeiros, carregarBarbeirosInativos])

    useEffect(() => {
        setPaginaAtual(1)
    }, [filtroBarbeiros, visualizacaoBarbeiros])

    useEffect(() => {
        if (paginaAtual > totalPaginas) {
            setPaginaAtual(totalPaginas)
        }
    }, [paginaAtual, totalPaginas])

    function limparFormulario() {
        setNomeBarbeiro('')
        setEmailBarbeiro('')
        setTelefoneBarbeiro('')
        setNomeProfissional('')
        setDescricaoProfissional('')
        setImagemProfissional('/profissionais/profissional-1.jpg')
        setBarbeiroEditandoId(null)
        setProfissionalEditandoId(null)
    }

    function abrirNovo() {
        limparFormulario()
        setModalAberto(true)
    }

    function abrirEdicao(barbeiro: BarbeiroAdmin) {
        setBarbeiroEditandoId(barbeiro.id)
        setProfissionalEditandoId(barbeiro.profissional?.id ?? null)
        setNomeBarbeiro(barbeiro.nome)
        setEmailBarbeiro(barbeiro.email)
        setTelefoneBarbeiro(mascararTelefone(barbeiro.telefone ?? ''))
        setNomeProfissional(barbeiro.profissional?.nome ?? '')
        setDescricaoProfissional(barbeiro.profissional?.descricao ?? '')
        setImagemProfissional(barbeiro.profissional?.imagemUrl ?? '/profissionais/profissional-1.jpg')
        setModalAberto(true)
    }

    async function salvar() {
        try {
            setErro('')

            if (!nomeBarbeiro || !emailBarbeiro || !nomeProfissional || !descricaoProfissional || !imagemProfissional) {
                setErro('Preencha os dados do barbeiro e do profissional.')
                return
            }

            if (!EMAIL_REGEX.test(emailNormalizado)) {
                setErro('Informe um e-mail valido.')
                return
            }

            if (erroTelefone) {
                setErro('Telefone invalido. Use 10 ou 11 digitos com DDD.')
                return
            }

            setCarregando(true)
            if (barbeiroEditandoId && profissionalEditandoId) {
                await httpPatch(`profissional/${profissionalEditandoId}`, {
                    nome: nomeProfissional,
                    descricao: descricaoProfissional,
                    imagemUrl: imagemProfissional,
                })

                await httpPatch(`auth/barbeiros/${barbeiroEditandoId}`, {
                    nome: nomeBarbeiro,
                    email: emailNormalizado,
                    telefone: telefoneDigitos || undefined,
                })
            } else {
                const profissionalCriado = await httpPost('profissional', {
                    nome: nomeProfissional,
                    descricao: descricaoProfissional,
                    imagemUrl: imagemProfissional,
                })

                await httpPost('auth/barbeiros', {
                    nome: nomeBarbeiro,
                    email: emailNormalizado,
                    telefone: telefoneDigitos || undefined,
                    profissionalId: profissionalCriado.id,
                })
            }

            setModalAberto(false)
            limparFormulario()
            await Promise.all([carregarBarbeiros(), carregarBarbeirosInativos()])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel salvar barbeiro.')
        } finally {
            setCarregando(false)
        }
    }

    async function selecionarEEnviarImagem() {
        try {
            setErro('')
            setCarregandoUploadImagem(true)

            const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (!permissao.granted) {
                setErro('Permissao de galeria negada.')
                return
            }

            const resultado = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.9,
            })

            if (resultado.canceled || !resultado.assets?.length) return

            const arquivo = resultado.assets[0]
            const formData = new FormData()
            formData.append('arquivo', {
                uri: arquivo.uri,
                name: arquivo.fileName ?? `profissional-${Date.now()}.jpg`,
                type: arquivo.mimeType ?? 'image/jpeg',
            } as any)

            const data = await httpPostFormData('profissional/upload-imagem', formData)
            if (!data?.imagemUrl) {
                throw new Error('Backend nao retornou URL da imagem do profissional.')
            }

            setImagemProfissional(data.imagemUrl)
        } catch (e: any) {
            setErro(e?.message ?? 'Falha ao enviar imagem do profissional.')
        } finally {
            setCarregandoUploadImagem(false)
        }
    }

    async function inativar(usuarioId: number) {
        try {
            setErro('')
            setCarregando(true)
            await httpPatch(`auth/barbeiros/${usuarioId}/inativar`, {})
            await Promise.all([carregarBarbeiros(), carregarBarbeirosInativos()])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel inativar barbeiro.')
        } finally {
            setCarregando(false)
        }
    }

    async function reativar(usuarioId: number) {
        try {
            setErro('')
            setCarregando(true)
            await httpPatch(`auth/barbeiros/${usuarioId}/reativar`, {})
            await Promise.all([carregarBarbeiros(), carregarBarbeirosInativos()])
        } catch (e: any) {
            setErro(e?.message ?? 'Nao foi possivel reativar barbeiro.')
        } finally {
            setCarregando(false)
        }
    }

    function confirmarInativacao(usuarioId: number, nome: string) {
        Alert.alert(
            'Inativar barbeiro',
            `Deseja realmente inativar ${nome}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Inativar',
                    style: 'destructive',
                    onPress: () => inativar(usuarioId),
                },
            ],
        )
    }

    function confirmarReativacao(usuarioId: number, nome: string) {
        Alert.alert(
            'Reativar barbeiro',
            `Deseja realmente reativar ${nome}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Reativar',
                    onPress: () => reativar(usuarioId),
                },
            ],
        )
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.titulo}>Barbeiros</Text>
                <Pressable style={styles.botaoNovo} onPress={abrirNovo} disabled={carregando}>
                    <Text style={styles.textoBotaoNovo}>Novo</Text>
                </Pressable>
            </View>

            <TextInput
                style={styles.inputFiltro}
                placeholder="Buscar por nome, e-mail ou profissional"
                placeholderTextColor="#8a8a8a"
                value={filtroBarbeiros}
                onChangeText={setFiltroBarbeiros}
            />

            <View style={styles.tabsVisualizacao}>
                <Pressable
                    style={[styles.tabVisualizacao, visualizacaoBarbeiros === 'ATIVOS' ? styles.tabVisualizacaoAtiva : null]}
                    onPress={() => setVisualizacaoBarbeiros('ATIVOS')}
                >
                    <Text style={styles.tabVisualizacaoTexto}>Ativos</Text>
                </Pressable>
                <Pressable
                    style={[styles.tabVisualizacao, visualizacaoBarbeiros === 'INATIVOS' ? styles.tabVisualizacaoAtiva : null]}
                    onPress={() => setVisualizacaoBarbeiros('INATIVOS')}
                >
                    <Text style={styles.tabVisualizacaoTexto}>Inativos</Text>
                </Pressable>
            </View>

            {erro ? <Text style={styles.erro}>{erro}</Text> : null}
            {carregando ? <Text style={styles.info}>Carregando...</Text> : null}
            {!carregando && barbeirosFiltrados.length === 0 ? (
                <Text style={styles.info}>
                    {visualizacaoBarbeiros === 'ATIVOS'
                        ? 'Nenhum barbeiro ativo cadastrado.'
                        : 'Nenhum barbeiro inativo encontrado.'}
                </Text>
            ) : null}

            <View style={styles.lista}>
                {barbeirosPaginados.map((barbeiro) => (
                    <View key={barbeiro.id} style={styles.card}>
                        <Text style={styles.nome}>{barbeiro.nome}</Text>
                        <Text style={styles.detalhe}>{barbeiro.email}</Text>
                        <Text style={styles.detalhe}>{mascararTelefone(barbeiro.telefone ?? '') || 'Sem telefone'}</Text>
                        <Text style={styles.detalhe}>Profissional: {barbeiro.profissional?.nome ?? 'Nao vinculado'}</Text>

                        <View style={styles.acoes}>
                            <Pressable
                                style={[styles.botaoAcao, styles.botaoEditar]}
                                onPress={() => abrirEdicao(barbeiro)}
                                disabled={carregando}
                            >
                                <Text style={styles.textoBotaoAcao}>Editar</Text>
                            </Pressable>
                            {visualizacaoBarbeiros === 'ATIVOS' ? (
                                <Pressable
                                    style={[styles.botaoAcao, styles.botaoInativar]}
                                    onPress={() => confirmarInativacao(barbeiro.id, barbeiro.nome)}
                                    disabled={carregando}
                                >
                                    <Text style={styles.textoBotaoAcao}>Inativar</Text>
                                </Pressable>
                            ) : null}
                            {visualizacaoBarbeiros === 'INATIVOS' ? (
                                <Pressable
                                    style={[styles.botaoAcao, styles.botaoReativar]}
                                    onPress={() => confirmarReativacao(barbeiro.id, barbeiro.nome)}
                                    disabled={carregando}
                                >
                                    <Text style={styles.textoBotaoAcao}>Reativar</Text>
                                </Pressable>
                            ) : null}
                        </View>
                    </View>
                ))}
            </View>

            {barbeirosFiltrados.length > 0 ? (
                <View style={styles.paginacao}>
                    <Text style={styles.textoPagina}>Pagina {paginaAtual} de {totalPaginas}</Text>
                    <View style={styles.acoesPagina}>
                        <Pressable
                            style={[styles.botaoPagina, paginaAtual <= 1 ? styles.botaoPaginaDesabilitado : null]}
                            disabled={paginaAtual <= 1}
                            onPress={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                        >
                            <Text style={styles.textoBotaoPagina}>Anterior</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.botaoPagina, paginaAtual >= totalPaginas ? styles.botaoPaginaDesabilitado : null]}
                            disabled={paginaAtual >= totalPaginas}
                            onPress={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                        >
                            <Text style={styles.textoBotaoPagina}>Proxima</Text>
                        </Pressable>
                    </View>
                </View>
            ) : null}

            <Modal animationType="slide" visible={modalAberto} onRequestClose={() => setModalAberto(false)}>
                <ScrollView style={styles.modal} contentContainerStyle={styles.modalConteudo}>
                    <Text style={styles.modalTitulo}>
                        {barbeiroEditandoId ? 'Editar barbeiro' : 'Cadastrar barbeiro'}
                    </Text>

                    <Text style={styles.label}>Nome do barbeiro</Text>
                    <TextInput
                        style={styles.input}
                        value={nomeBarbeiro}
                        onChangeText={setNomeBarbeiro}
                        placeholder="Nome"
                        placeholderTextColor="#888"
                    />

                    <Text style={styles.label}>E-mail</Text>
                    <TextInput
                        style={[styles.input, erroEmail ? styles.inputErro : null]}
                        value={emailBarbeiro}
                        onChangeText={setEmailBarbeiro}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="email@dominio.com"
                        placeholderTextColor="#888"
                    />
                    {erroEmail ? <Text style={styles.erroCampo}>Informe um e-mail valido.</Text> : null}

                    <Text style={styles.label}>Telefone</Text>
                    <TextInput
                        style={[styles.input, erroTelefone ? styles.inputErro : null]}
                        value={telefoneBarbeiro}
                        onChangeText={(v) => setTelefoneBarbeiro(mascararTelefone(v))}
                        keyboardType="phone-pad"
                        placeholder="(11) 99999-9999"
                        placeholderTextColor="#888"
                    />
                    {erroTelefone ? (
                        <Text style={styles.erroCampo}>Telefone invalido. Informe DDD + numero.</Text>
                    ) : null}

                    <Text style={styles.label}>Nome de exibicao</Text>
                    <TextInput
                        style={styles.input}
                        value={nomeProfissional}
                        onChangeText={setNomeProfissional}
                        placeholder="Nome do profissional"
                        placeholderTextColor="#888"
                    />

                    <Text style={styles.label}>Descricao</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={descricaoProfissional}
                        onChangeText={setDescricaoProfissional}
                        multiline
                        placeholder="Descricao para exibicao"
                        placeholderTextColor="#888"
                    />

                    <Text style={styles.label}>Imagem (URL)</Text>
                    <TextInput
                        style={styles.input}
                        value={imagemProfissional}
                        onChangeText={setImagemProfissional}
                        placeholder="/profissionais/profissional-x.jpg"
                        placeholderTextColor="#888"
                    />

                    <Pressable
                        style={[styles.botaoUpload, carregandoUploadImagem ? styles.botaoUploadDesabilitado : null]}
                        onPress={selecionarEEnviarImagem}
                        disabled={carregandoUploadImagem || carregando}
                    >
                        <Text style={styles.textoBotaoUpload}>
                            {carregandoUploadImagem ? 'Enviando imagem...' : 'Escolher imagem da galeria'}
                        </Text>
                    </Pressable>

                    {imagemPreviewProfissional ? (
                        <Image source={{ uri: imagemPreviewProfissional }} style={styles.previewImagem} />
                    ) : null}

                    <View style={styles.modalAcoes}>
                        <Pressable
                            style={[styles.botaoAcaoModal, styles.botaoCancelar]}
                            onPress={() => {
                                setModalAberto(false)
                                limparFormulario()
                            }}
                        >
                            <Text style={styles.textoBotaoModal}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.botaoAcaoModal, styles.botaoSalvar]}
                            onPress={salvar}
                            disabled={carregando || carregandoUploadImagem || erroEmail || erroTelefone}
                        >
                            <Text style={styles.textoBotaoModal}>Salvar</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#2c2c2c',
        paddingTop: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    titulo: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    botaoNovo: {
        backgroundColor: '#16a34a',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    textoBotaoNovo: {
        color: '#fff',
        fontWeight: '700',
    },
    erro: {
        color: '#f87171',
        marginTop: 10,
    },
    info: {
        color: '#a1a1aa',
        marginTop: 10,
    },
    inputFiltro: {
        marginTop: 12,
        backgroundColor: '#171717',
        color: '#fff',
        borderWidth: 1,
        borderColor: '#2e2e2e',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    tabsVisualizacao: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 10,
    },
    tabVisualizacao: {
        backgroundColor: '#3f3f46',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
    },
    tabVisualizacaoAtiva: {
        backgroundColor: '#1d4ed8',
    },
    tabVisualizacaoTexto: {
        color: '#fff',
        fontWeight: '700',
    },
    lista: {
        gap: 10,
        marginTop: 10,
    },
    card: {
        backgroundColor: '#161616',
        borderWidth: 1,
        borderColor: '#2e2e2e',
        borderRadius: 10,
        padding: 12,
    },
    nome: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    detalhe: {
        color: '#a1a1aa',
        marginTop: 2,
    },
    acoes: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 10,
    },
    botaoAcao: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
    },
    botaoEditar: {
        backgroundColor: '#1d4ed8',
    },
    botaoInativar: {
        backgroundColor: '#b91c1c',
    },
    botaoReativar: {
        backgroundColor: '#047857',
    },
    textoBotaoAcao: {
        color: '#fff',
        fontWeight: '600',
    },
    paginacao: {
        marginTop: 12,
        gap: 8,
    },
    textoPagina: {
        color: '#d4d4d8',
    },
    acoesPagina: {
        flexDirection: 'row',
        gap: 10,
    },
    botaoPagina: {
        backgroundColor: '#3f3f46',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
    },
    botaoPaginaDesabilitado: {
        opacity: 0.45,
    },
    textoBotaoPagina: {
        color: '#fff',
        fontWeight: '600',
    },
    modal: {
        backgroundColor: '#0a0a0a',
    },
    modalConteudo: {
        padding: 18,
        paddingBottom: 30,
    },
    modalTitulo: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 16,
    },
    label: {
        color: '#cbd5e1',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#171717',
        color: '#fff',
        borderWidth: 1,
        borderColor: '#2e2e2e',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    inputErro: {
        borderColor: '#ef4444',
    },
    erroCampo: {
        color: '#f87171',
        marginTop: 6,
    },
    textArea: {
        minHeight: 90,
        textAlignVertical: 'top',
    },
    botaoUpload: {
        marginTop: 12,
        backgroundColor: '#0369a1',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    botaoUploadDesabilitado: {
        opacity: 0.6,
    },
    textoBotaoUpload: {
        color: '#fff',
        fontWeight: '700',
    },
    previewImagem: {
        marginTop: 12,
        width: '100%',
        height: 170,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2e2e2e',
    },
    modalAcoes: {
        marginTop: 22,
        flexDirection: 'row',
        gap: 12,
    },
    botaoAcaoModal: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    botaoCancelar: {
        backgroundColor: '#374151',
    },
    botaoSalvar: {
        backgroundColor: '#16a34a',
    },
    textoBotaoModal: {
        color: '#fff',
        fontWeight: '700',
    },
})
