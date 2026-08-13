import { Profissional } from '@neto-bastos/core'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { obterImagem } from '../../data/constants/imagens'

interface ProfissionalInputProps {
    profissionais: Profissional[]
    profissional: Profissional | null
    profissionalMudou: (profissional: Profissional) => void
}

export default function ProfissionalInput(props: ProfissionalInputProps) {
    const { profissionais, profissional, profissionalMudou } = props

    function obterImagemProfissional(p: Profissional) {
        return obterImagem('profissionais', p.id, p.imagemUrl)
    }

    function renderizarProfissional(p: Profissional) {
        return (
            <View
                key={p?.id}
                style={{
                    ...styles.profissionalContainer,
                    backgroundColor: profissional?.id === p?.id ? '#22c55e' : '#18181b',
                }}
            >
                <Pressable onPress={() => profissionalMudou(p)}>
                    <View style={{ alignItems: 'center' }}>
                        <Image
                            style={{ width: 100, height: 100, borderRadius: 6 }}
                            source={obterImagemProfissional(p)}
                        />
                        <Text style={{ color: 'white', paddingVertical: 5 }}>
                            {p.nome.split(' ')[0]}
                        </Text>
                    </View>
                </Pressable>
            </View>
        )
    }

    return (
        <View style={styles.container}>{profissionais.map((p) => renderizarProfissional(p))}</View>
    )
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 40,
        gap: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    profissionalContainer: {
        justifyContent: 'center',
        alignItems: 'center',

        borderRadius: 8,
        padding: 2,
    },
})
