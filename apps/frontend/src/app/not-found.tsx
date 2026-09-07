import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center gap-4 h-screen bg-zinc-900 text-zinc-100 text-center px-4">
            <span className="text-6xl font-black">404</span>
            <p className="text-zinc-400">Essa página não existe ou foi movida.</p>
            <Link href="/" className="button bg-green-600">
                Voltar para o início
            </Link>
        </div>
    )
}
