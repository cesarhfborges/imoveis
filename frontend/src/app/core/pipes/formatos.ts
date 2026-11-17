import { Pipe, PipeTransform } from '@angular/core';
import { Finalidade } from '@/app/core/models/models';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** R$ 850.000,00 (com "/mês" ou "/dia" conforme a finalidade). */
@Pipe({ name: 'preco' })
export class PrecoPipe implements PipeTransform {
    transform(valor: number | null | undefined, finalidade?: Finalidade | null): string {
        if (valor == null) {
            return 'Sob consulta';
        }
        const sufixo = finalidade === 'ALUGUEL' ? '/mês' : finalidade === 'TEMPORADA' ? '/dia' : '';
        return BRL.format(valor) + sufixo;
    }
}

/** Valor do m²: preço / área útil. */
@Pipe({ name: 'valorM2' })
export class ValorM2Pipe implements PipeTransform {
    transform(preco: number | null | undefined, area: number | null | undefined): string {
        if (!preco || !area) {
            return '';
        }
        return BRL.format(preco / area);
    }
}

@Pipe({ name: 'numero' })
export class NumeroPipe implements PipeTransform {
    transform(v: number | null | undefined): string {
        return v == null ? '' : NUM.format(v);
    }
}

/** "há 3 dias", "hoje"... */
@Pipe({ name: 'tempoAtras' })
export class TempoAtrasPipe implements PipeTransform {
    transform(iso: string | null | undefined): string {
        if (!iso) {
            return '';
        }
        const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
        if (dias <= 0) return 'hoje';
        if (dias === 1) return 'há 1 dia';
        if (dias < 30) return `há ${dias} dias`;
        const meses = Math.floor(dias / 30);
        return meses === 1 ? 'há 1 mês' : `há ${meses} meses`;
    }
}

/** "agora", "há 5 min", "há 3 h", "ontem", "12/11" (para notificações e conversas). */
@Pipe({ name: 'tempoRelativo' })
export class TempoRelativoPipe implements PipeTransform {
    transform(iso: string | null | undefined): string {
        if (!iso) return '';
        const data = new Date(iso);
        const min = Math.floor((Date.now() - data.getTime()) / 60000);
        if (min < 1) return 'agora';
        if (min < 60) return `há ${min} min`;
        const h = Math.floor(min / 60);
        if (h < 24) return `há ${h} h`;
        if (h < 48) return 'ontem';
        return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
}

/** Texto para URL amigável: "Casa com piscina" -> "casa-com-piscina". */
export function slug(texto: string | null | undefined): string {
    return (texto ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

/** Só os dígitos: "(61) 99999-8888" -> "61999998888". */
export function digitos(v: string | null | undefined): string {
    return (v ?? '').replace(/\D/g, '');
}

/** Telefone com 10 ou 11 dígitos: (61) 3333-4444 ou (61) 99999-8888 (outros tamanhos ficam como vieram). */
export function formatarTelefone(v: string | null | undefined): string | null {
    const d = digitos(v);
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return v?.trim() || null;
}

/** CEP com 8 dígitos: 70040010 -> 70.040-010 (outros tamanhos ficam como vieram). */
export function formatarCep(v: string | null | undefined): string | null {
    const d = digitos(v);
    if (d.length === 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}-${d.slice(5)}`;
    return v?.trim() || null;
}

/** Exibe o CEP salvo só com dígitos como 99.999-999. */
@Pipe({ name: 'cep' })
export class CepPipe implements PipeTransform {
    transform(v: string | null | undefined): string {
        return formatarCep(v) ?? '';
    }
}

/** Exibe o telefone salvo só com dígitos como (99) 9999-9999 ou (99) 99999-9999. */
@Pipe({ name: 'telefone' })
export class TelefonePipe implements PipeTransform {
    transform(v: string | null | undefined): string {
        return formatarTelefone(v) ?? '';
    }
}

/** CPF (11 dígitos) 000.000.000-00 ou CNPJ (14 dígitos) 00.000.000/0000-00 (outros tamanhos ficam como vieram). */
export function formatarDocumento(v: string | null | undefined): string | null {
    const d = digitos(v);
    if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    return v?.trim() || null;
}

/** Exibe CPF ou CNPJ salvo só com dígitos no formato oficial. */
@Pipe({ name: 'documento' })
export class DocumentoPipe implements PipeTransform {
    transform(v: string | null | undefined): string {
        return formatarDocumento(v) ?? '';
    }
}
