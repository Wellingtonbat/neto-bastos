import { createNavigationContainerRef } from '@react-navigation/native'

// Permite navegar de fora da arvore de componentes (ex.: dentro de um hook
// como useAPI, que roda em resposta a uma chamada HTTP e nao tem acesso ao
// useNavigation()). Precisa ser atribuido ao NavigationContainer em App.tsx.
export const navigationRef = createNavigationContainerRef()

export function navegarParaLogin() {
    if (!navigationRef.isReady()) return
    navigationRef.reset({
        index: 0,
        routes: [{ name: 'Cadastro' as never }],
    })
}
