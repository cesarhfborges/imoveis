import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { AreaAviso, Aviso, AvisoForm, AvisoPublico } from '@/app/core/models/models';

/** Aceites guardados no navegador: { [id do aviso]: versão aceita }. Vale para visitantes e logados. */
const CHAVE_ACEITES = 'imoveis.avisos.aceites';
/** Fechados sem aceitar nesta sessão: { [id]: versão }. Voltam na próxima sessão do navegador. */
const CHAVE_DISPENSADOS = 'imoveis.avisos.dispensados';

type Versoes = Record<string, number>;

function ler(storage: Storage | undefined, chave: string): Versoes {
    try {
        const v = JSON.parse(storage?.getItem(chave) ?? '{}');
        return v && typeof v === 'object' ? v : {};
    } catch {
        return {};
    }
}

function gravar(storage: Storage | undefined, chave: string, v: Versoes) {
    try {
        storage?.setItem(chave, JSON.stringify(v));
    } catch {
        /* navegador sem armazenamento: o aviso volta a aparecer, sem quebrar a página */
    }
}

const local = typeof localStorage !== 'undefined' ? localStorage : undefined;
const sessao = typeof sessionStorage !== 'undefined' ? sessionStorage : undefined;

/**
 * Avisos do site (cookies, comunicados, FAQ...). Um aviso aparece enquanto a versão atual não foi aceita:
 * logado, o aceite fica no servidor (e no navegador); visitante, só no navegador. Quando a administração muda o
 * conteúdo, a versão sobe e o aviso aparece de novo para todos. Fechar sem aceitar (se permitido) esconde só
 * nesta sessão.
 */
@Injectable({ providedIn: 'root' })
export class AvisosService {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private router = inject(Router);

    private aceitesLocais = signal<Versoes>(ler(local, CHAVE_ACEITES));
    private dispensados = signal<Versoes>(ler(sessao, CHAVE_DISPENSADOS));
    private sincronizados = new Set<string>();

    /** O aviso ainda deve aparecer? */
    pendente(a: AvisoPublico): boolean {
        const aceitaServidor = a.versaoAceita ?? 0;
        const aceitaLocal = this.aceitesLocais()[a.id] ?? 0;
        const dispensada = this.dispensados()[a.id] ?? 0;
        if (aceitaServidor >= a.versao || dispensada >= a.versao) return false;
        if (aceitaLocal >= a.versao) {
            // aceitou neste navegador (ex.: antes de entrar): leva o aceite para a conta, sem perguntar de novo
            if (this.auth.logado()) this.sincronizar(a);
            return false;
        }
        return true;
    }

    /** Avisos vigentes da área (vazio se a API não responder: o site segue funcionando). */
    vigentes(area: AreaAviso): Observable<AvisoPublico[]> {
        return this.api.get<AvisoPublico[]>('/app/public/avisos', { area }).pipe(catchError(() => of([])));
    }

    /** Aceitou: guarda no navegador e, logado, na conta; depois executa a ação (abrir o endereço). */
    aceitar(a: AvisoPublico) {
        this.aceitesLocais.update((v) => ({ ...v, [a.id]: a.versao }));
        gravar(local, CHAVE_ACEITES, this.aceitesLocais());
        if (this.auth.logado()) {
            this.api.post(`/app/avisos/${a.id}/aceite`, { versao: a.versao }).pipe(catchError(() => of(null))).subscribe();
        }
        if (a.acaoAceite === 'LINK' && a.linkAceite) {
            abrirLink(this.router, a.linkAceite, a.novaAba);
        }
    }

    /** Fechou sem aceitar: some só nesta sessão do navegador. */
    dispensar(a: AvisoPublico) {
        this.dispensados.update((v) => ({ ...v, [a.id]: a.versao }));
        gravar(sessao, CHAVE_DISPENSADOS, this.dispensados());
    }

    private sincronizar(a: AvisoPublico) {
        const chave = a.id + ':' + a.versao;
        if (this.sincronizados.has(chave)) return;
        this.sincronizados.add(chave);
        this.api.post(`/app/avisos/${a.id}/aceite`, { versao: a.versao }).pipe(catchError(() => of(null))).subscribe();
    }

    // ------------------------------------------------------------ administração

    listar(): Observable<Aviso[]> {
        return this.api.get('/app/admin/avisos');
    }

    salvar(id: number | null, form: AvisoForm): Observable<Aviso> {
        return id ? this.api.put(`/app/admin/avisos/${id}`, form) : this.api.post('/app/admin/avisos', form);
    }

    excluir(id: number): Observable<void> {
        return this.api.delete(`/app/admin/avisos/${id}`);
    }
}

/** Endereço interno vai pelo roteador; externo (ou em nova aba) abre pelo navegador. */
export function abrirLink(router: Router, url: string, novaAba: boolean) {
    const externo = /^https?:\/\//i.test(url);
    if (novaAba) {
        window.open(url, '_blank', 'noopener');
    } else if (externo) {
        window.location.href = url;
    } else {
        router.navigateByUrl(url);
    }
}
