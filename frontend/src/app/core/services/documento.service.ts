import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AceiteDocumento, DocumentoAdmin, DocumentoForm, DocumentoPublico, DocumentoResumo, Perfil, VersaoDocumento, VersaoDocumentoDetalhe } from '@/app/core/models/models';

/** Documentos do site (termos de uso, privacidade/LGPD, código de conduta…): leitura, aceite e cadastro. */
@Injectable({ providedIn: 'root' })
export class DocumentoService {
    private api = inject(ApiService);

    /** Documentos públicos ativos (central /documentos e rodapé), carregados sob demanda e reaproveitados. */
    readonly publicos = signal<DocumentoResumo[]>([]);
    private publicosCarregados = false;

    carregarPublicos(forcar = false) {
        if (this.publicosCarregados && !forcar) return;
        this.publicosCarregados = true;
        this.api.get<DocumentoResumo[]>('/app/public/documentos').subscribe({ next: (l) => this.publicos.set(l), error: () => (this.publicosCarregados = false) });
    }

    listarPublicos(): Observable<DocumentoResumo[]> {
        return this.api.get<DocumentoResumo[]>('/app/public/documentos').pipe(tap((l) => this.publicos.set(l)));
    }

    porSlug(slug: string): Observable<DocumentoPublico> {
        return this.api.get(`/app/public/documentos/${encodeURIComponent(slug)}`);
    }

    exigidosNoCadastro(perfil: Perfil): Observable<DocumentoPublico[]> {
        return this.api.get('/app/public/documentos/cadastro', { perfil });
    }

    pendentes(): Observable<DocumentoPublico[]> {
        return this.api.get('/app/conta/documentos/pendentes');
    }

    aceitar(itens: AceiteDocumento[]): Observable<void> {
        return this.api.post('/app/conta/documentos/aceites', { itens });
    }

    // ---- administração
    listarAdmin(excluidos = false): Observable<DocumentoAdmin[]> {
        return this.api.get('/app/admin/documentos', { excluidos });
    }

    obterAdmin(id: number): Observable<DocumentoAdmin> {
        return this.api.get(`/app/admin/documentos/${id}`);
    }

    criar(form: DocumentoForm): Observable<DocumentoAdmin> {
        return this.api.post('/app/admin/documentos', form);
    }

    atualizar(id: number, form: DocumentoForm): Observable<DocumentoAdmin> {
        return this.api.put(`/app/admin/documentos/${id}`, form);
    }

    situacao(id: number, ativo: boolean): Observable<DocumentoAdmin> {
        return this.api.patch(`/app/admin/documentos/${id}/situacao`, { ativo });
    }

    excluir(id: number): Observable<void> {
        return this.api.delete(`/app/admin/documentos/${id}`);
    }

    restaurar(id: number): Observable<DocumentoAdmin> {
        return this.api.post(`/app/admin/documentos/${id}/restaurar`);
    }

    versoes(id: number): Observable<VersaoDocumento[]> {
        return this.api.get(`/app/admin/documentos/${id}/versoes`);
    }

    versao(id: number, versao: number): Observable<VersaoDocumentoDetalhe> {
        return this.api.get(`/app/admin/documentos/${id}/versoes/${versao}`);
    }
}
