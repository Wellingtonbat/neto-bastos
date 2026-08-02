'use client'
import { ProvedorUsuario } from '@/data/contexts/ContextoUsuario'
import { GoogleOAuthProvider } from '@react-oauth/google'
import LoaderRequisicoesGlobais from '@/components/shared/LoaderRequisicoesGlobais'

export default function Layout({ children }: any) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!clientId) {
        return (
            <LoaderRequisicoesGlobais>
                <ProvedorUsuario>{children}</ProvedorUsuario>
            </LoaderRequisicoesGlobais>
        )
    }

    return (
        <LoaderRequisicoesGlobais>
            <GoogleOAuthProvider clientId={clientId}>
                <ProvedorUsuario>{children}</ProvedorUsuario>
            </GoogleOAuthProvider>
        </LoaderRequisicoesGlobais>
    )
}
