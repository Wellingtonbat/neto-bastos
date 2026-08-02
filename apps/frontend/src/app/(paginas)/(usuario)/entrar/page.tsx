'use client'
import FormUsuario from '@/components/usuario/FormUsuario'
import { Suspense } from 'react'

export default function page(){
    return (
        <Suspense fallback = {<div>Carregando...</div>}>
            <FormUsuario />
        </Suspense>
    )
}