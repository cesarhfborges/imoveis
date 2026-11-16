import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Endereço devolvido por GET /cep/v2/{cep}. */
export interface BrasilApiCep {
    cep: string;
    state: string;
    city: string;
    neighborhood: string | null;
    street: string | null;
    service: string;
    location?: { type: string; coordinates: { longitude?: string; latitude?: string } };
}

/**
 * Cliente da BrasilAPI (https://brasilapi.com.br/docs), API pública e gratuita
 * com dados do Brasil (CEP, CNPJ, bancos, feriados, DDD...).
 */
@Injectable({ providedIn: 'root' })
export class BrasilApiService {
    private http = inject(HttpClient);
    private readonly base = 'https://brasilapi.com.br/api';

    /** Remove tudo que não é dígito do CEP. */
    static limparCep(cep: string | null | undefined): string {
        return (cep ?? '').replace(/\D/g, '');
    }

    /** Busca o endereço de um CEP (8 dígitos, com ou sem máscara). Responde 404 quando o CEP não existe. */
    cep(cep: string): Observable<BrasilApiCep> {
        return this.http.get<BrasilApiCep>(`${this.base}/cep/v2/${BrasilApiService.limparCep(cep)}`);
    }
}
