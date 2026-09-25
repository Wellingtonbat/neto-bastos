import { useState } from 'react'
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { TelefoneUtils } from '@neto-bastos/core'
import useUsuario from '@/src/data/hooks/useUsuario'

interface EditarPerfilModalProps {
    aoFechar: () => void
}

export default function EditarPerfilModal(props: EditarPerfilModalProps) {
    const { usuario, atualizarMeuPerfil } = useUsuario()
    const [nome, setNome] = useState(usuario?.nome ?? '')
    const [telefone, setTelefone] = useState(usuario?.telefone ?? '')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')

    async function salvar() {
        if (!nome.trim()) {
            setErro('Informe seu nome.')
            return
        }

        try {
            setErro('')
            setSalvando(true)
            await atualizarMeuPerfil({ nome: nome.trim(), telefone })
            props.aoFechar()
        } catch (e: any) {
            setErro(e?.message ?? 'Não foi possível salvar as alterações.')
        } finally {
            setSalvando(false)
        }
    }

    return (
        <Modal animationType="slide" visible transparent onRequestClose={props.aoFechar}>
            <View style={styles.fundo}>
                <View style={styles.cartao}>
                    <View style={styles.cabecalho}>
                        <Text style={styles.titulo}>Editar perfil</Text>
                        <Pressable onPress={props.aoFechar}>
                            <Text style={styles.fechar}>✕</Text>
                        </Pressable>
                    </View>

                    {erro ? <Text style={styles.erro}>{erro}</Text> : null}

                    <Text style={styles.label}>Nome</Text>
                    <TextInput
                        style={styles.input}
                        value={nome}
                        onChangeText={setNome}
                        placeholder="Seu nome"
                        placeholderTextColor="#71717a"
                    />

                    <Text style={styles.label}>Telefone</Text>
                    <TextInput
                        style={styles.input}
                        value={TelefoneUtils.formatar(telefone)}
                        onChangeText={(v) => setTelefone(TelefoneUtils.desformatar(v))}
                        placeholder="Seu telefone"
                        placeholderTextColor="#71717a"
                        keyboardType="phone-pad"
                    />

                    <Text style={styles.label}>E-mail</Text>
                    <View style={styles.inputDesabilitado}>
                        <Text style={styles.textoDesabilitado}>{usuario?.email}</Text>
                    </View>
                    <Text style={styles.dica}>O e-mail é usado para entrar e não pode ser alterado aqui.</Text>

                    <Pressable style={styles.botaoPrimario} onPress={salvar} disabled={salvando}>
                        {salvando ? (
                            <ActivityIndicator color="#0b0f14" />
                        ) : (
                            <Text style={styles.botaoPrimarioTexto}>Salvar alterações</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    fundo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    cartao: {
        backgroundColor: '#0a0a0a',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 20,
        gap: 10,
    },
    cabecalho: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    titulo: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    fechar: {
        color: '#a1a1aa',
        fontSize: 18,
    },
    erro: {
        color: '#f87171',
        fontSize: 13,
    },
    label: {
        color: '#a1a1aa',
        fontSize: 12,
        marginTop: 4,
    },
    input: {
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 14,
    },
    inputDesabilitado: {
        backgroundColor: '#111113',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    textoDesabilitado: {
        color: '#71717a',
        fontSize: 14,
    },
    dica: {
        color: '#52525b',
        fontSize: 11,
    },
    botaoPrimario: {
        marginTop: 10,
        backgroundColor: '#22c55e',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    botaoPrimarioTexto: {
        color: '#0b0f14',
        fontWeight: '700',
        fontSize: 14,
    },
})
