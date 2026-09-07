const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE ?? ''

export function resolverImagemUrl(url?: string | null): string {
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    if (url.startsWith('/imagens/')) return `${URL_BASE}${url}`
    return url
}
