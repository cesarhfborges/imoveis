import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ApiToken, ApiTokenCriado, ClientePainel, ExclusaoContaStatus, Dashboard, ImovelDetalhe, QuedaPreco, ImovelResumo, PageResponse, PeriodoPainel, Perfil, PerfilForm, Usuario, UsuarioAdminForm, VistoRecente } from '@/app/core/models/models';

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

    /** Painel do perfil cliente: atividade, recomendações, quedas de preço e financiamentos. */
    painelCliente(): Observable<ClientePainel> {
        return this.api.get('/app/conta/painel');
    }

    /** Detalhes completos dos favoritos escolhidos para comparar (até 4; não conta visualização). */
    compararFavoritos(ids: number[]): Observable<ImovelDetalhe[]> {
        return this.api.get('/app/conta/favoritos/comparar', { ids: ids.join(',') });
    }

    /** Favoritos que baixaram de preço desde que foram salvos. */
    quedasPreco(): Observable<QuedaPreco[]> {
        return this.api.get('/app/conta/favoritos/quedas');
    }

    /** Histórico "Vistos recentemente" (do mais recente). */
    vistos(page = 0, size = 24): Observable<PageResponse<VistoRecente>> {
        return this.api.get('/app/conta/vistos', { page, size });
    }

    removerVisto(imovelId: number): Observable<void> {
        return this.api.delete(`/app/conta/vistos/${imovelId}`);
    }

    limparVistos(): Observable<void> {
        return this.api.delete('/app/conta/vistos');
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

    salvarPerfil(dados: PerfilForm): Observable<Usuario> {
        return this.api.put('/app/conta/perfil', dados);
    }

    trocarSenha(senhaAtual: string, novaSenha: string): Observable<void> {
        return this.api.put('/app/conta/senha', { senhaAtual, novaSenha });
    }

    /** "Remover conta": situação do pedido e prazo de espera. */
    exclusao(): Observable<ExclusaoContaStatus> {
        return this.api.get('/app/conta/exclusao');
    }

    /** Pede a remoção definitiva da conta (confirmada com a senha). */
    pedirExclusao(senha: string): Observable<ExclusaoContaStatus> {
        return this.api.post('/app/conta/exclusao', { senha });
    }

    /** Desiste do pedido de remoção. */
    desistirExclusao(): Observable<ExclusaoContaStatus> {
        return this.api.delete('/app/conta/exclusao');
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

    dashboard(dias: PeriodoPainel = 30): Observable<Dashboard> {
        return this.api.get('/app/admin/dashboard', { dias });
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

    /** Exclusão definitiva (LGPD): apaga a conta e os dados dela; não pode ser desfeita. */
    excluirUsuarioDefinitivo(id: number): Observable<void> {
        return this.api.delete(`/app/admin/usuarios/${id}/definitivo`);
    }
}

/** Envio de imagens: devolve a URL pública. */
@Injectable({ providedIn: 'root' })
export class UploadService {
    private api = inject(ApiService);

    /**
     * @param endpoint `/app/uploads` (anúncios, logo: corretor e admin) ou `/app/conta/foto` (foto de perfil: qualquer usuário logado)
     */
    enviar(arquivo: File, endpoint = '/app/uploads'): Observable<{ url: string }> {
        const fd = new FormData();
        fd.append('arquivo', arquivo);
        return this.api.post(endpoint, fd);
    }
}
