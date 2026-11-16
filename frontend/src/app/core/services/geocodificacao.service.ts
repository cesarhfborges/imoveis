import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface EnderecoBusca {
    endereco?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
    cep?: string | null;
}

/** Quão perto do endereço informado a posição encontrada está. */
export type PrecisaoGeo = 'endereco' | 'cep' | 'bairro' | 'cidade';

export interface ResultadoGeo {
    lat: number;
    lng: number;
    precisao: PrecisaoGeo;
}

interface Tentativa {
    params: Record<string, string>;
    precisao: PrecisaoGeo;
}

/**
 * Geocodificação gratuita pelo Nominatim (OpenStreetMap).
 *
 * Uma consulta com todos os campos costuma falhar (ex.: "Quadra SBN Quadra 1, Asa Norte, Brasília"
 * ou bairros dos Correios como "Sul (Águas Claras)"), então tenta do mais preciso ao mais genérico:
 * logradouro → CEP → bairro → cidade. Respeita o limite de 1 requisição/segundo do Nominatim.
 */
@Injectable({ providedIn: 'root' })
export class GeocodificacaoService {
    private http = inject(HttpClient);
    private readonly url = 'https://nominatim.openstreetmap.org/search';

    async localizar(e: EnderecoBusca): Promise<ResultadoGeo | null> {
        for (const [i, t] of this.tentativas(e).entries()) {
            if (i > 0) await esperar(1100);
            const lista = await firstValueFrom(
                this.http.get<{ lat: string; lon: string }[]>(this.url, {
                    params: new HttpParams({ fromObject: { format: 'json', limit: '1', countrycodes: 'br', 'accept-language': 'pt-BR', ...t.params } })
                })
            );
            if (lista.length) {
                return { lat: +Number(lista[0].lat).toFixed(7), lng: +Number(lista[0].lon).toFixed(7), precisao: t.precisao };
            }
        }
        return null;
    }

    private tentativas(e: EnderecoBusca): Tentativa[] {
        const limpo = (s?: string | null) => (s ?? '').trim();
        const rua = limpo(e.endereco);
        const ruaNum = [rua, limpo(e.numero)].filter(Boolean).join(' ');
        const cidade = limpo(e.cidade);
        const uf = limpo(e.uf);
        const cep = (e.cep ?? '').replace(/\D/g, '');
        // "Sul (Águas Claras)" → ["Sul (Águas Claras)", "Águas Claras", "Sul"]
        const bairroBruto = limpo(e.bairro);
        const dentro = bairroBruto.match(/\(([^)]+)\)/)?.[1]?.trim();
        const fora = bairroBruto.replace(/\([^)]*\)/g, '').trim();
        const bairros = [...new Set([bairroBruto, dentro, fora].filter((b): b is string => !!b))];

        const q = (...partes: string[]) => partes.filter(Boolean).join(', ');
        const lista: Tentativa[] = [];
        if (rua) {
            lista.push({ params: { q: q(ruaNum, bairroBruto, cidade, uf) }, precisao: 'endereco' });
            if (ruaNum !== rua) lista.push({ params: { q: q(rua, bairroBruto, cidade, uf) }, precisao: 'endereco' });
            lista.push({ params: { q: q(rua, cidade, uf) }, precisao: 'endereco' });
            for (const b of bairros.slice(1)) lista.push({ params: { q: q(rua, b, uf) }, precisao: 'endereco' });
        }
        if (cep.length === 8) {
            lista.push({ params: { postalcode: `${cep.slice(0, 5)}-${cep.slice(5)}` }, precisao: 'cep' });
        }
        for (const b of bairros) lista.push({ params: { q: q(b, cidade, uf) }, precisao: 'bairro' });
        if (cidade) lista.push({ params: { q: q(cidade, uf) }, precisao: 'cidade' });

        const vistos = new Set<string>();
        return lista.filter((t) => {
            const k = JSON.stringify(t.params).toLowerCase();
            return !vistos.has(k) && !!vistos.add(k);
        });
    }
}

function esperar(ms: number) {
    return new Promise((ok) => setTimeout(ok, ms));
}
