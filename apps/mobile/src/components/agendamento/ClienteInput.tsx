import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

export interface ClienteAdmin {
    id: number
    nome: string
    email: string
    telefone?: string | null
}

interface ClienteInputProps {
    clientes: ClienteAdmin[]
    cliente: ClienteAdmin | null
    clienteMudou: (cliente: ClienteAdmin) => void
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
                    <Pressable
                        onPress={() => props.clienteMudou(item)}
                        style={[
                            styles.item,
                            props.cliente?.id === item.id ? styles.itemSelecionado : null,
                        ]}
                    >
                        <Text style={styles.itemNome}>{item.nome}</Text>
                        <Text style={styles.itemEmail}>{item.email}</Text>
                    </Pressable>
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
})
