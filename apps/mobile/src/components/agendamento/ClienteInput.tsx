import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

export interface ClienteAdmin {
    id: number
    nome: string
    email: string
    telefone?: string | null
    clienteRecorrente?: boolean
}

interface ClienteInputProps {
    clientes: ClienteAdmin[]
    cliente: ClienteAdmin | null
    clienteMudou: (cliente: ClienteAdmin) => void
    aoAlternarRecorrente?: (cliente: ClienteAdmin) => void
}

export default function ClienteInput(props: ClienteInputProps) {
    const [filtro, setFiltro] = useState('')

    const clientesFiltrados = useMemo(() => {
        const termo = filtro.trim().toLowerCase()
        if (!termo) return props.clientes

        return props.clientes.filter(
            (cliente) =>
                cliente.nome.toLowerCase().includes(termo) ||
                cliente.email.toLowerCase().includes(termo)
        )
    }, [props.clientes, filtro])

    return (
        <View style={styles.container}>
            <TextInput
                placeholder="Buscar cliente por nome ou e-mail"
                placeholderTextColor="#71717a"
                value={filtro}
                onChangeText={setFiltro}
                style={styles.input}
            />
            <FlatList
                data={clientesFiltrados}
                keyExtractor={(item) => String(item.id)}
                style={styles.lista}
                nestedScrollEnabled
                ListEmptyComponent={<Text style={styles.vazio}>Nenhum cliente encontrado.</Text>}
                renderItem={({ item }) => (
                    <View
                        style={[
                            styles.item,
                            styles.itemLinha,
                            props.cliente?.id === item.id ? styles.itemSelecionado : null,
                        ]}
                    >
                        <Pressable style={{ flex: 1 }} onPress={() => props.clienteMudou(item)}>
                            <Text style={styles.itemNome}>{item.nome}</Text>
                            <Text style={styles.itemEmail}>{item.email}</Text>
                        </Pressable>
                        {props.aoAlternarRecorrente ? (
                            <Pressable
                                onPress={() => props.aoAlternarRecorrente!(item)}
                                style={[
                                    styles.chipRecorrente,
                                    item.clienteRecorrente ? styles.chipRecorrenteAtivo : null,
                                ]}
                            >
                                <Text style={styles.chipRecorrenteTexto}>
                                    {item.clienteRecorrente ? '✓ Fixo' : 'Marcar fixo'}
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>
                )}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
        marginVertical: 20,
    },
    input: {
        backgroundColor: '#18181b',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: 'white',
    },
    lista: {
        maxHeight: 320,
    },
    vazio: {
        color: '#71717a',
        textAlign: 'center',
        paddingVertical: 10,
    },
    item: {
        backgroundColor: '#18181b',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    itemSelecionado: {
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
    },
    itemNome: {
        color: 'white',
        fontSize: 14,
    },
    itemEmail: {
        color: '#a1a1aa',
        fontSize: 12,
    },
    itemLinha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chipRecorrente: {
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    chipRecorrenteAtivo: {
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
    },
    chipRecorrenteTexto: {
        color: '#d4d4d8',
        fontSize: 10,
        fontWeight: '700',
    },
})
