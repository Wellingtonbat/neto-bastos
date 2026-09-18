// Monta o payload Pix "BR Code" (EMV QR Code) a partir de chave, nome do
// recebedor, cidade e valor -- formato TLV (id + tamanho de 2 digitos +
// valor), fechado com CRC16-CCITT-FALSE. Sem dependencia de DOM/rede,
// roda tanto no backend (Node) quanto no cliente (browser/React Native).
export default class PixUtils {
    static formatarChavePix(telefoneBruto: string): string {
        const digitos = (telefoneBruto || '').replace(/\D/g, '')
        if (digitos.length === 0) return ''
        if (digitos.indexOf('55') === 0 && digitos.length > 11) {
            return '+' + digitos
        }
        return '+55' + digitos
    }

    static removerAcentos(str: string): string {
        // Remove marcas de acentuacao combinantes (faixa Unicode 0x0300-0x036f,
        // geradas por normalize('NFD')) por codigo numerico, em vez de uma
        // classe de regex com esses caracteres literais.
        const semAcento = (str || '')
            .normalize('NFD')
            .split('')
            .filter((ch) => {
                const codigo = ch.charCodeAt(0)
                return codigo < 0x0300 || codigo > 0x036f
            })
            .join('')
        return semAcento.replace(/[^A-Za-z0-9 ]/g, '').trim()
    }

    private static tlv(id: string, valor: string): string {
        const len = String(valor.length).padStart(2, '0')
        return id + len + valor
    }

    private static crc16(payload: string): string {
        const polinomio = 0x1021
        let resultado = 0xffff
        for (let i = 0; i < payload.length; i++) {
            resultado ^= payload.charCodeAt(i) << 8
            for (let b = 0; b < 8; b++) {
                if ((resultado & 0x8000) !== 0) {
                    resultado = ((resultado << 1) ^ polinomio) & 0xffff
                } else {
                    resultado = (resultado << 1) & 0xffff
                }
            }
        }
        return resultado.toString(16).toUpperCase().padStart(4, '0')
    }

    static montarPayload(cfg: {
        telefone: string
        nomeRecebedor: string
        cidade: string
        valor: number
        identificador?: string
    }): string {
        const chave = PixUtils.formatarChavePix(cfg.telefone)
        const nome = PixUtils.removerAcentos(cfg.nomeRecebedor).toUpperCase().slice(0, 25) || 'BARBEARIA'
        const cidade = PixUtils.removerAcentos(cfg.cidade).toUpperCase().slice(0, 15) || 'BRASIL'
        const txid = (cfg.identificador ?? 'ATDNETOBASTOS').slice(0, 25)

        const contaPix = PixUtils.tlv('00', 'BR.GOV.BCB.PIX') + PixUtils.tlv('01', chave || '+5500000000000')
        const infoAdicional = PixUtils.tlv('05', txid)

        const partes = [
            PixUtils.tlv('00', '01'),
            PixUtils.tlv('26', contaPix),
            PixUtils.tlv('52', '0000'),
            PixUtils.tlv('53', '986'),
            PixUtils.tlv('54', cfg.valor.toFixed(2)),
            PixUtils.tlv('58', 'BR'),
            PixUtils.tlv('59', nome),
            PixUtils.tlv('60', cidade),
            PixUtils.tlv('62', infoAdicional),
        ]

        const semCrc = partes.join('') + '6304'
        return semCrc + PixUtils.crc16(semCrc)
    }
}
