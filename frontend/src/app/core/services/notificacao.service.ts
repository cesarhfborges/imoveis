import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { Observable, Subject, Subscription, catchError, merge, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { RealtimeService, canalDoUsuario } from './realtime.service';
import { Notificacao, PageResponse } from '@/app/core/models/models';

/** Sem tempo real: consulta o contador a cada 30 s. */
const INTERVALO_MS = 30_000;
/** Com tempo real conectado, a consulta vira só uma conferência de segurança (a cada 5 min). */
const INTERVALO_COM_SOCKET_MS = 5 * 60_000;

/**
 * Notificações do usuário logado (geral do sistema).
 *
 * Em tempo real (canal `private-usuario.{id}`): `notificacao.nova` traz a notificação inteira, que entra no
 * topo da lista sem nova requisição, e `notificacao.contador` mantém o total de não lidas igual em todas as abas.
 * Sem o tempo real, o contador é consultado periodicamente e quando a aba volta a ter foco.
 */
@Injectable({ providedIn: 'root' })
export class NotificacaoService {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private realtime = inject(RealtimeService);

    readonly naoLidas = signal(0);
    /** Notificações que acabaram de chegar pelo socket (a lista do sino as coloca no topo). */
    readonly novas$ = new Subject<Notificacao>();

    private timer: ReturnType<typeof setInterval> | null = null;
    private ultimaConsulta = 0;
    private eventos: Subscription | null = null;
    private aoVoltar = () => {
        if (document.visibilityState === 'visible') this.atualizarContador();
    };

    constructor() {
        effect(() => {
            const id = this.auth.logado() ? (this.auth.usuario()?.id ?? null) : null;
            this.parar();
            if (id != null) this.iniciar(id);
        });
        inject(DestroyRef).onDestroy(() => this.parar());
    }

    private iniciar(usuarioId: number) {
        this.atualizarContador();
        const canal = canalDoUsuario(usuarioId);
        this.eventos = merge(
            this.realtime.ouvir<{ notificacao: Notificacao; naoLidas: number }>(canal, 'notificacao.nova').pipe(
                tap((e) => {
                    this.naoLidas.set(e.naoLidas);
                    this.novas$.next(e.notificacao);
                })
            ),
            this.realtime.ouvir<{ naoLidas: number }>(canal, 'notificacao.contador').pipe(tap((e) => this.naoLidas.set(e.naoLidas)))
        ).subscribe();
        this.timer = setInterval(() => {
            const intervalo = this.realtime.conectado() ? INTERVALO_COM_SOCKET_MS : INTERVALO_MS;
            if (Date.now() - this.ultimaConsulta >= intervalo - 1000) this.atualizarContador();
        }, INTERVALO_MS);
        document.addEventListener('visibilitychange', this.aoVoltar);
    }

    private parar() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.eventos?.unsubscribe();
        this.eventos = null;
        document.removeEventListener('visibilitychange', this.aoVoltar);
        this.naoLidas.set(0);
    }

    atualizarContador() {
        this.ultimaConsulta = Date.now();
        this.api
            .get<{ naoLidas: number }>('/app/notificacoes/contador')
            .pipe(catchError(() => of(null)))
            .subscribe((r) => {
                if (r) this.naoLidas.set(r.naoLidas);
            });
    }

    listar(page = 0, size = 15, naoLidas = false): Observable<PageResponse<Notificacao>> {
        return this.api.get('/app/notificacoes', { page, size, naoLidas });
    }

    /** Marca como lida e devolve a notificação (com o link). */
    abrir(id: number): Observable<Notificacao> {
        return this.api.post<Notificacao>(`/app/notificacoes/${id}/abrir`).pipe(tap(() => this.contadorSemSocket()));
    }

    marcar(id: number, lida: boolean): Observable<Notificacao> {
        return this.api.patch<Notificacao>(`/app/notificacoes/${id}`, {}, { lida }).pipe(tap(() => this.contadorSemSocket()));
    }

    marcarTodasLidas(): Observable<unknown> {
        return this.api.post('/app/notificacoes/lidas').pipe(tap(() => this.contadorSemSocket()));
    }

    apagar(id: number): Observable<void> {
        return this.api.delete<void>(`/app/notificacoes/${id}`).pipe(tap(() => this.contadorSemSocket()));
    }

    apagarLidas(): Observable<unknown> {
        return this.api.delete('/app/notificacoes/lidas').pipe(tap(() => this.contadorSemSocket()));
    }

    /** Com o socket conectado o próprio backend manda o novo total; sem ele, consulta. */
    private contadorSemSocket() {
        if (!this.realtime.conectado()) this.atualizarContador();
    }
}
