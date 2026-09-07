'use client'

export default function ErrorPage({
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 h-screen bg-zinc-900 text-zinc-100 text-center px-4">
            <span className="text-2xl font-bold">Algo deu errado.</span>
            <p className="text-zinc-400">Tente novamente em instantes.</p>
            <button onClick={reset} className="button bg-green-600">
                Tentar novamente
            </button>
        </div>
    )
}
