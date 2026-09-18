// Gerador de QR Code (modo byte, nivel de correcao M) implementado do
// zero -- sem depender de nenhuma biblioteca externa/CDN, ja que carregar
// de CDNs de terceiros se mostrou pouco confiavel em campo. Implementa a
// especificacao ISO/IEC 18004 (Reed-Solomon sobre GF(256), BCH para as
// informacoes de formato/versao) para as versoes 1-15 no nivel de
// correcao M, o suficiente para os payloads Pix BR Code que este app
// gera (tipicamente 120-160 caracteres). Sem dependencia de DOM/Canvas,
// roda tanto no navegador quanto em React Native -- quem chama decide
// como desenhar a matriz resultante (SVG, grade de Views, etc).

// ---------- GF(256) ----------
const GF_EXP: number[] = new Array(512)
const GF_LOG: number[] = new Array(256)
;(function inicializarGF() {
    let x = 1
    for (let i = 0; i < 255; i++) {
        GF_EXP[i] = x
        GF_LOG[x] = i
        x = x << 1
        if (x & 0x100) x ^= 0x11d
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]
})()

function gfMul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0
    return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

// poly *= (x - a^i)  == (x + a^i) em GF(2^8)
function mulPolyByMonomial(poly: number[], i: number): number[] {
    const root = GF_EXP[i]
    const result = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
        result[j] ^= poly[j]
        result[j + 1] ^= gfMul(poly[j], root)
    }
    return result
}
function rsGeneratorPoly(degree: number): number[] {
    let poly = [1]
    for (let i = 0; i < degree; i++) poly = mulPolyByMonomial(poly, i)
    return poly
}
const _genCache: Record<number, number[]> = {}
function rsGenCache(degree: number): number[] {
    if (!_genCache[degree]) _genCache[degree] = rsGeneratorPoly(degree)
    return _genCache[degree]
}
function rsEncode(dataBytes: number[], ecCount: number): number[] {
    const gen = rsGenCache(ecCount)
    const msg = dataBytes.slice()
    for (let i = 0; i < ecCount; i++) msg.push(0)
    for (let i = 0; i < dataBytes.length; i++) {
        const coef = msg[i]
        if (coef === 0) continue
        for (let j = 0; j < gen.length; j++) msg[i + j] ^= gfMul(gen[j], coef)
    }
    return msg.slice(dataBytes.length)
}

// ---------- tabelas (apenas nivel de correcao M) ----------
// versao: [ecPorBloco, g1Blocos, g1TamDados, g2Blocos, g2TamDados]
const EC_INFO: Record<number, [number, number, number, number, number]> = {
    1: [10, 1, 16, 0, 0],
    2: [16, 1, 28, 0, 0],
    3: [26, 1, 44, 0, 0],
    4: [18, 2, 32, 0, 0],
    5: [24, 2, 43, 0, 0],
    6: [16, 4, 27, 0, 0],
    7: [18, 4, 31, 0, 0],
    8: [22, 2, 38, 2, 39],
    9: [22, 3, 36, 2, 37],
    10: [26, 4, 43, 1, 44],
    11: [30, 1, 50, 4, 51],
    12: [22, 6, 36, 2, 37],
    13: [22, 8, 37, 1, 38],
    14: [24, 4, 40, 5, 41],
    15: [24, 5, 41, 5, 42],
}
const ALIGN: Record<number, number[]> = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
    9: [6, 26, 46],
    10: [6, 28, 50],
    11: [6, 30, 54],
    12: [6, 32, 58],
    13: [6, 34, 62],
    14: [6, 26, 46, 66],
    15: [6, 26, 48, 70],
}
const REMAINDER_BITS: Record<number, number> = {
    1: 0,
    2: 7,
    3: 7,
    4: 7,
    5: 7,
    6: 7,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 0,
    13: 0,
    14: 3,
    15: 3,
}

function dataCodewordsForVersion(v: number): number {
    const info = EC_INFO[v]
    return info[1] * info[2] + info[3] * info[4]
}

// ---------- bitstream ----------
class BitWriter {
    bits: number[] = []
    push(val: number, len: number) {
        for (let i = len - 1; i >= 0; i--) this.bits.push((val >> i) & 1)
    }
    toBytes(): number[] {
        const bytes: number[] = []
        for (let i = 0; i < this.bits.length; i += 8) {
            let b = 0
            for (let j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] || 0)
            bytes.push(b)
        }
        return bytes
    }
}

function utf8Bytes(str: string): number[] {
    const out: number[] = []
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i)
        if (code < 0x80) out.push(code)
        else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
        else out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
    return out
}

function chooseVersion(byteLen: number): number {
    for (let v = 1; v <= 15; v++) {
        const countBits = v <= 9 ? 8 : 16
        const capacityBits = dataCodewordsForVersion(v) * 8
        const usedBits = 4 + countBits + byteLen * 8
        if (usedBits <= capacityBits) return v
    }
    throw new Error('payload grande demais para este gerador (max v15-M)')
}

function buildDataCodewords(bytes: number[], version: number): number[] {
    const countBits = version <= 9 ? 8 : 16
    const bw = new BitWriter()
    bw.push(0x4, 4) // modo byte
    bw.push(bytes.length, countBits)
    for (let i = 0; i < bytes.length; i++) bw.push(bytes[i], 8)

    const capacityBits = dataCodewordsForVersion(version) * 8
    const remaining = capacityBits - bw.bits.length
    const termLen = Math.min(4, remaining)
    bw.push(0, termLen)
    while (bw.bits.length % 8 !== 0) bw.bits.push(0)

    const codewords = bw.toBytes()
    const pad = [0xec, 0x11]
    let pi = 0
    while (codewords.length < dataCodewordsForVersion(version)) {
        codewords.push(pad[pi % 2])
        pi++
    }
    return codewords
}

interface Bloco {
    data: number[]
    ec: number[]
}

function splitBlocks(dataCodewords: number[], version: number): Bloco[] {
    const info = EC_INFO[version]
    const [ecLen, g1n, g1len, g2n, g2len] = info
    const blocks: Bloco[] = []
    let pos = 0
    for (let i = 0; i < g1n; i++) {
        const data = dataCodewords.slice(pos, pos + g1len)
        pos += g1len
        blocks.push({ data, ec: rsEncode(data, ecLen) })
    }
    for (let i = 0; i < g2n; i++) {
        const data = dataCodewords.slice(pos, pos + g2len)
        pos += g2len
        blocks.push({ data, ec: rsEncode(data, ecLen) })
    }
    return blocks
}

function interleave(blocks: Bloco[]): number[] {
    const out: number[] = []
    let maxData = 0
    for (const b of blocks) maxData = Math.max(maxData, b.data.length)
    for (let i = 0; i < maxData; i++) {
        for (const b of blocks) if (i < b.data.length) out.push(b.data[i])
    }
    const ecLen = blocks[0].ec.length
    for (let i = 0; i < ecLen; i++) {
        for (const b of blocks) out.push(b.ec[i])
    }
    return out
}

// ---------- informacao de formato / versao (BCH) ----------
const FORMAT_EC_BITS: Record<string, number> = { L: 0x1, M: 0x0, Q: 0x3, H: 0x2 }
function formatInfoBits(ecLevel: string, maskId: number): number {
    const data = (FORMAT_EC_BITS[ecLevel] << 3) | maskId
    const g = 0x537
    let val = data << 10
    for (let i = 14; i >= 10; i--) if (val & (1 << i)) val ^= g << (i - 10)
    const bits15 = (data << 10) | val
    return bits15 ^ 0x5412
}
function versionInfoBits(version: number): number {
    const g = 0x1f25
    let val = version << 12
    for (let i = 17; i >= 12; i--) if (val & (1 << i)) val ^= g << (i - 12)
    return (version << 12) | val
}

// ---------- montagem da matriz ----------
function makeGrid<T>(n: number, fill: T): T[][] {
    const g: T[][] = []
    for (let i = 0; i < n; i++) {
        const row: T[] = []
        for (let j = 0; j < n; j++) row.push(fill)
        g.push(row)
    }
    return g
}

function placeFinder(dark: boolean[][], isFn: boolean[][], r: number, c: number) {
    for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
            const rr = r + dr
            const cc = c + dc
            if (rr < 0 || cc < 0 || rr >= dark.length || cc >= dark.length) continue
            isFn[rr][cc] = true
            const onBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7
            const inner = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6
            const outerRing = inner && (dr === 0 || dr === 6 || dc === 0 || dc === 6)
            const core = inner && dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
            dark[rr][cc] = !onBorder && (outerRing || core)
        }
    }
}

function placeAlignment(dark: boolean[][], isFn: boolean[][], r: number, c: number) {
    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            const rr = r + dr
            const cc = c + dc
            isFn[rr][cc] = true
            const ring = dr === -2 || dr === 2 || dc === -2 || dc === 2
            const core = dr === 0 && dc === 0
            dark[rr][cc] = ring || core
        }
    }
}

interface Skeleton {
    n: number
    dark: boolean[][]
    isFn: boolean[][]
}

function buildSkeleton(version: number): Skeleton {
    const n = 4 * version + 17
    const dark = makeGrid(n, false)
    const isFn = makeGrid(n, false)

    placeFinder(dark, isFn, 0, 0)
    placeFinder(dark, isFn, n - 7, 0)
    placeFinder(dark, isFn, 0, n - 7)

    for (let i = 8; i < n - 8; i++) {
        isFn[6][i] = true
        dark[6][i] = i % 2 === 0
        isFn[i][6] = true
        dark[i][6] = i % 2 === 0
    }

    isFn[4 * version + 9][8] = true
    dark[4 * version + 9][8] = true

    const coords = ALIGN[version]
    for (let i = 0; i < coords.length; i++) {
        for (let j = 0; j < coords.length; j++) {
            const r = coords[i]
            const c = coords[j]
            if ((r <= 7 && c <= 7) || (r <= 7 && c >= n - 8) || (r >= n - 8 && c <= 7)) continue
            placeAlignment(dark, isFn, r, c)
        }
    }

    for (let i = 0; i <= 8; i++) {
        isFn[8][i] = true
        isFn[i][8] = true
    }
    for (let i = 0; i < 8; i++) {
        isFn[8][n - 1 - i] = true
        isFn[n - 1 - i][8] = true
    }
    isFn[n - 8][8] = true

    if (version >= 7) {
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 3; j++) {
                isFn[i][n - 11 + j] = true
                isFn[n - 11 + j][i] = true
            }
        }
    }

    return { n, dark, isFn }
}

function placeData(skeleton: Skeleton, codewordBytes: number[], remainderBits: number): boolean[][] {
    const n = skeleton.n
    const bits: number[] = []
    for (let i = 0; i < codewordBytes.length; i++) {
        for (let b = 7; b >= 0; b--) bits.push((codewordBytes[i] >> b) & 1)
    }
    for (let i = 0; i < remainderBits; i++) bits.push(0)

    const dataDark = makeGrid(n, false)
    let bi = 0
    let col = n - 1
    let dir = -1
    while (col > 0) {
        if (col === 6) col--
        for (let k = 0; k < n; k++) {
            const row = dir === -1 ? n - 1 - k : k
            for (let dc = 0; dc < 2; dc++) {
                const c = col - dc
                if (skeleton.isFn[row][c]) continue
                const bitVal = bi < bits.length ? bits[bi] : 0
                bi++
                dataDark[row][c] = bitVal === 1
            }
        }
        dir = -dir
        col -= 2
    }
    return dataDark
}

const MASKS: Array<(r: number, c: number) => boolean> = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
]

function applyMask(skeleton: Skeleton, dataDark: boolean[][], maskId: number): boolean[][] {
    const n = skeleton.n
    const out = makeGrid(n, false)
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (skeleton.isFn[r][c]) {
                out[r][c] = skeleton.dark[r][c]
            } else {
                let bit = dataDark[r][c]
                if (MASKS[maskId](r, c)) bit = !bit
                out[r][c] = bit
            }
        }
    }
    return out
}

function penaltyScore(grid: boolean[][]): number {
    const n = grid.length
    let score = 0
    function runPenalty(getVal: (i: number) => boolean): number {
        let p = 0
        let run = 1
        let prev: boolean | null = null
        for (let i = 0; i < n; i++) {
            const v = getVal(i)
            if (v === prev) {
                run++
            } else {
                if (run >= 5) p += 3 + (run - 5)
                run = 1
                prev = v
            }
        }
        if (run >= 5) p += 3 + (run - 5)
        return p
    }
    for (let r = 0; r < n; r++) score += runPenalty((c) => grid[r][c])
    for (let c = 0; c < n; c++) score += runPenalty((r) => grid[r][c])

    for (let r = 0; r < n - 1; r++) {
        for (let c = 0; c < n - 1; c++) {
            const v = grid[r][c]
            if (grid[r][c + 1] === v && grid[r + 1][c] === v && grid[r + 1][c + 1] === v) score += 3
        }
    }

    const pattern = [true, false, true, true, true, false, true]
    function matchPattern(vals: boolean[], i: number): boolean {
        for (let k = 0; k < 7; k++) if (vals[i + k] !== pattern[k]) return false
        return true
    }
    function checkLine(vals: boolean[]): number {
        let p = 0
        for (let i = 0; i + 6 < vals.length; i++) {
            if (matchPattern(vals, i)) {
                const beforeLight = i >= 4 ? vals.slice(i - 4, i).every((x) => x === false) : false
                const afterLight = i + 11 <= vals.length ? vals.slice(i + 7, i + 11).every((x) => x === false) : false
                if (beforeLight || afterLight) p += 40
            }
        }
        return p
    }
    for (let r = 0; r < n; r++) score += checkLine(grid[r])
    for (let c = 0; c < n; c++) {
        const col: boolean[] = []
        for (let r = 0; r < n; r++) col.push(grid[r][c])
        score += checkLine(col)
    }

    let dark = 0
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (grid[r][c]) dark++
    const pct = (dark * 100) / (n * n)
    const prevMult = Math.abs(Math.floor(pct / 5) * 5 - 50) / 5
    const nextMult = Math.abs(Math.ceil(pct / 5) * 5 - 50) / 5
    score += Math.min(prevMult, nextMult) * 10

    return score
}

function writeFormatInfo(grid: boolean[][], ecLevel: string, maskId: number) {
    const n = grid.length
    const bits = formatInfoBits(ecLevel, maskId)
    const bit = (i: number) => ((bits >> i) & 1) === 1

    // copy A (top-left): col8 rows0-5 = bits0-5; row7,col8=bit6; row8,col8=bit7;
    // row8,col7=bit8; row8,cols5..0 = bits9..14 (skipping the timing col/row)
    for (let i = 0; i <= 5; i++) grid[i][8] = bit(i)
    grid[7][8] = bit(6)
    grid[8][8] = bit(7)
    grid[8][7] = bit(8)
    for (let i = 9; i <= 14; i++) grid[8][14 - i] = bit(i)

    // copy B (mirrored): row8 cols n-1..n-8 = bits0..7; col8 rows n-7..n-1 = bits8..14
    for (let i = 0; i <= 7; i++) grid[8][n - 1 - i] = bit(i)
    for (let i = 8; i <= 14; i++) grid[n - 15 + i][8] = bit(i)
}

function writeVersionInfo(grid: boolean[][], version: number) {
    if (version < 7) return
    const n = grid.length
    const bits = versionInfoBits(version)
    const bit = (i: number) => ((bits >> i) & 1) === 1
    for (let i = 0; i < 18; i++) {
        const r = Math.floor(i / 3)
        const c = i % 3
        grid[r][n - 11 + c] = bit(i)
        grid[n - 11 + c][r] = bit(i)
    }
}

export interface MatrizQr {
    n: number
    version: number
    mask: number
    modulos: boolean[][]
}

export default class QrCodeUtils {
    // Gera a matriz de modulos (claro/escuro) de um QR Code para o
    // conteudo informado, no nivel de correcao M. Quem chama decide como
    // desenhar: SVG no navegador, grade de Views em React Native, etc.
    static gerar(texto: string, ecLevel: 'M' = 'M'): MatrizQr {
        const bytes = utf8Bytes(texto)
        const version = chooseVersion(bytes.length)
        const dataCw = buildDataCodewords(bytes, version)
        const blocks = splitBlocks(dataCw, version)
        const finalCw = interleave(blocks)
        const skeleton = buildSkeleton(version)
        const dataDark = placeData(skeleton, finalCw, REMAINDER_BITS[version])

        let best: { grid: boolean[][]; score: number; mask: number } | null = null
        for (let m = 0; m < 8; m++) {
            const grid = applyMask(skeleton, dataDark, m)
            const score = penaltyScore(grid)
            if (!best || score < best.score) best = { grid, score, mask: m }
        }
        writeFormatInfo(best!.grid, ecLevel, best!.mask)
        writeVersionInfo(best!.grid, version)

        return { n: skeleton.n, version, mask: best!.mask, modulos: best!.grid }
    }

    // Conveniencia para uso no navegador: monta um <svg>...</svg> pronto,
    // com uma margem de quiet-zone ao redor.
    static gerarSvg(texto: string, margem = 4): string {
        const { n, modulos } = QrCodeUtils.gerar(texto)
        const tamanho = n + margem * 2
        let quadrados = ''
        for (let linha = 0; linha < n; linha++) {
            for (let coluna = 0; coluna < n; coluna++) {
                if (modulos[linha][coluna]) {
                    quadrados += `<rect x="${coluna + margem}" y="${linha + margem}" width="1" height="1"/>`
                }
            }
        }
        return (
            `<svg viewBox="0 0 ${tamanho} ${tamanho}" xmlns="http://www.w3.org/2000/svg" ` +
            `shape-rendering="crispEdges" fill="#0a0e0d">` +
            `<rect x="0" y="0" width="${tamanho}" height="${tamanho}" fill="#ffffff"/>` +
            quadrados +
            `</svg>`
        )
    }

    // Conveniencia para React Native (sem depender de react-native-svg):
    // reduz a matriz a "trechos" horizontais contiguos de modulos escuros,
    // pra quem for desenhar como uma grade de Views precisar de bem menos
    // elementos nativos do que um por modulo (um QR de versao 8 tem ~2400
    // modulos, mas normalmente so umas poucas centenas de trechos).
    static paraTrechosEscuros(modulos: boolean[][]): Array<{
        linha: number
        colInicio: number
        colFim: number
    }> {
        const trechos: Array<{ linha: number; colInicio: number; colFim: number }> = []
        for (let linha = 0; linha < modulos.length; linha++) {
            let colInicio = -1
            for (let coluna = 0; coluna <= modulos[linha].length; coluna++) {
                const escuro = coluna < modulos[linha].length && modulos[linha][coluna]
                if (escuro && colInicio === -1) {
                    colInicio = coluna
                } else if (!escuro && colInicio !== -1) {
                    trechos.push({ linha, colInicio, colFim: coluna - 1 })
                    colInicio = -1
                }
            }
        }
        return trechos
    }
}
