import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ApiToken, ApiTokenCriado, Dashboard, ImovelResumo, PageResponse, Perfil, Usuario, UsuarioAdminForm } from '@/app/core/models/models';

/** Dados da própria conta, favoritos e tokens de API. */
@Injectable({ providedIn: 'root' })
export class ContaService {
    private api = inject(ApiService);
    private auth = inject(AuthService);

    /** Ids dos favoritos do usuário logado (para marcar os corações). */
    readonly favoritos = signal<Set<number>>(new Set());

    carregarFavoritos() {
        if (!this.auth.logado()) {
            this.favoritos.set(new Set());
            return;
        }
        this.api
            .get<number[]>('/app/conta/favoritos/ids')
            .pipe(catchError(() => of([] as number[])))
            .subscribe((ids) => this.favoritos.set(new Set(ids)));
    }

    listarFavoritos(): Observable<ImovelResumo[]> {
        return this.api.get('/app/conta/favoritos');
    }

    alternarFavorito(id: number): Observable<unknown> {
        const tem = this.favoritos().has(id);
        const req = tem ? this.api.delete(`/app/conta/favoritos/${id}`) : this.api.post(`/app/conta/favoritos/${id}`);
        return req.pipe(
            tap(() => {
                const s = new Set(this.favoritos());
                tem ? s.delete(id) : s.add(id);
                this.favoritos.set(s);
            })
        );
    }

    perfil(): Observable<Usuario> {
        return this.api.get('/app/conta/perfil');
    }

    salvarPerfil(dados: { nome: string; telefone: string | null; creci: string | null; fotoUrl: string | null }): Observable<Usuario> {
        return this.api.put('/app/conta/perfil', dados);
    }

    trocarSenha(senhaAtual: string, novaSenha: string): Observable<void> {
        return this.api.put('/app/conta/senha', { senhaAtual, novaSenha });
    }

    tokens(): Observable<ApiToken[]> {
        return this.api.get('/app/conta/tokens');
    }

    criarToken(nome: string, perfil: Perfil, validadeDias: number | null): Observable<ApiTokenCriado> {
        return this.api.post('/app/conta/tokens', { nome, perfil, validadeDias });
    }

    revogarToken(id: number): Observable<void> {
        return this.api.delete(`/app/conta/tokens/${id}`);
    }
}

/** Gestão de usuários e painel (somente ADMIN). */
@Injectable({ providedIn: 'root' })
export class AdminService {
    private api = inject(ApiService);

    dashboard(): Observable<Dashboard> {
        return this.api.get('/app/admin/dashboard');
    }

    usuarios(q: string | null, papel: Perfil | null, page = 0, size = 20): Observable<PageResponse<Usuario>> {
        return this.api.get('/app/admin/usuarios', { q, papel, page, size });
    }

    criarUsuario(form: UsuarioAdminForm): Observable<Usuario> {
        return this.api.post('/app/admin/usuarios', form);
    }

    atualizarUsuario(id: number, form: UsuarioAdminForm): Observable<Usuario> {
        return this.api.put(`/app/admin/usuarios/${id}`, form);
    }

    desativarUsuario(id: number): Observable<void> {
        return this.api.delete(`/app/admin/usuarios/${id}`);
    }
}

/** Envio de imagens: devolve a URL pública. */
@Injectable({ providedIn: 'root' })
export class UploadService {
    private api = inject(ApiService);

    enviar(arquivo: File): Observable<{ url: string }> {
        const fd = new FormData();
        fd.append('arquivo', arquivo);
        return this.api.post('/app/uploads', fd);
    }
}
