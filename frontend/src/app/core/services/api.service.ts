import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';

/** Cliente HTTP fino para a API do site (/app/**), com montagem de parâmetros de busca. */
@Injectable({ providedIn: 'root' })
export class ApiService {
    private http = inject(HttpClient);
    private base = environment.apiUrl;

    get<T>(url: string, params?: object): Observable<T> {
        return this.http.get<T>(this.base + url, { params: toParams(params), withCredentials: true });
    }

    post<T>(url: string, body?: unknown, params?: object): Observable<T> {
        return this.http.post<T>(this.base + url, body ?? {}, { params: toParams(params), withCredentials: true });
    }

    put<T>(url: string, body: unknown): Observable<T> {
        return this.http.put<T>(this.base + url, body, { withCredentials: true });
    }

    patch<T>(url: string, body?: unknown, params?: object): Observable<T> {
        return this.http.patch<T>(this.base + url, body ?? {}, { params: toParams(params), withCredentials: true });
    }

    delete<T>(url: string): Observable<T> {
        return this.http.delete<T>(this.base + url, { withCredentials: true });
    }
}

export function toParams(obj?: object): HttpParams {
    let p = new HttpParams();
    if (!obj) {
        return p;
    }
    for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined || v === '') {
            continue;
        }
        if (Array.isArray(v)) {
            v.filter((x) => x !== null && x !== undefined && x !== '').forEach((x) => (p = p.append(k, String(x))));
        } else {
            p = p.set(k, String(v));
        }
    }
    return p;
}

/** Extrai a mensagem amigável de um erro da API. */
export function mensagemErro(err: any, padrao = 'Não foi possível concluir. Tente novamente.'): string {
    const e = err?.error;
    if (e && typeof e === 'object' && typeof e.message === 'string') {
        const campos = e.fields && Object.keys(e.fields).length ? ': ' + Object.entries(e.fields).map(([k, v]) => `${k} ${v}`).join('; ') : '';
        return e.message + campos;
    }
    return padrao;
}
