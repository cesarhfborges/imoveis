import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { LoginRequest, Perfil, RegistroRequest, Sessao } from '@/app/core/models/models';

/** Sessão do usuário (cookie de sessão do backend). O perfil ativo é o escolhido no login. */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private api = inject(ApiService);
    private router = inject(Router);

    readonly sessao = signal<Sessao>({ autenticado: false, usuario: null, perfil: null, perfisDisponiveis: [] });
    readonly carregada = signal(false);

    readonly logado = computed(() => this.sessao().autenticado);
    readonly perfil = computed(() => this.sessao().perfil);
    readonly usuario = computed(() => this.sessao().usuario);
    readonly isAdmin = computed(() => this.sessao().perfil === 'ADMIN');
    readonly isCorretor = computed(() => this.sessao().perfil === 'CORRETOR');

    /** Garante o cookie CSRF e carrega a sessão atual. */
    async carregar(): Promise<void> {
        await firstValueFrom(this.api.get('/app/auth/csrf').pipe(catchError(() => of(null))));
        await firstValueFrom(this.recarregar());
        this.carregada.set(true);
    }

    recarregar(): Observable<Sessao> {
        return this.api.get<Sessao>('/app/auth/me').pipe(
            catchError(() => of<Sessao>({ autenticado: false, usuario: null, perfil: null, perfisDisponiveis: [] })),
            tap((s) => this.sessao.set(s))
        );
    }

    login(req: LoginRequest): Observable<Sessao> {
        return this.api.post<Sessao>('/app/auth/login', req).pipe(tap((s) => this.sessao.set(s)));
    }

    registrar(req: RegistroRequest): Observable<Sessao> {
        return this.api.post<Sessao>('/app/auth/registro', req).pipe(tap((s) => this.sessao.set(s)));
    }

    trocarPerfil(perfil: Perfil): Observable<Sessao> {
        return this.api.post<Sessao>('/app/auth/perfil', { perfil }).pipe(tap((s) => this.sessao.set(s)));
    }

    sair(destino = '/') {
        this.api
            .post('/app/auth/logout')
            .pipe(catchError(() => of(null)))
            .subscribe(() => {
                this.sessao.set({ autenticado: false, usuario: null, perfil: null, perfisDisponiveis: [] });
                // novo token CSRF para a próxima ação
                this.api
                    .get('/app/auth/csrf')
                    .pipe(catchError(() => of(null)))
                    .subscribe();
                this.router.navigateByUrl(destino);
            });
    }

    pode(perfil: Perfil): boolean {
        return this.sessao().perfisDisponiveis.includes(perfil);
    }
}
