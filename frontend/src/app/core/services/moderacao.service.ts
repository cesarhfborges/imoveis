import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
    Calendario,
    ContadorPendencias,
    DiaExpediente,
    Denuncia,
    Feriado,
    Gravidade,
    GrupoPendencias,
    MedidaAnuncio,
    Natureza,
    MinhaDenuncia,
    ModeracaoConfig,
    PageResponse,
    PenalidadeConta,
    PendenciasImovel,
    TipoDenuncia,
    TipoDenunciaPublico
} from '@/app/core/models/models';

export type FiltroDenuncias = 'ABERTAS' | 'EM_ANALISE' | 'EM_APURACAO' | 'AGUARDANDO_ANUNCIANTE' | 'ENCERRADAS' | 'TODAS';
export type AcaoImovel = 'SUSPENDER' | 'REATIVAR' | 'BANIR';

export interface ProcedenteForm {
    natureza: Natureza;
    medida: MedidaAnuncio;
    penalidade: PenalidadeConta;
    /** correção: prazo em minutos úteis (nulo: o prazo de ajuste das regras) */
    prazoMinutos: number | null;
    suspenderAteCorrigir: boolean;
    conclusao: string;
    notaInterna: string | null;
}

export interface ReaberturaForm {
    motivo: string;
    reativarConta: boolean;
    reativarAnuncio: boolean;
}

/** Denúncias (denunciante, anunciante e administração), regras da moderação e calendário. */
@Injectable({ providedIn: 'root' })
export class ModeracaoService {
    private api = inject(ApiService);

    /** Contadores para os selos do menu. */
    readonly contadorAnunciante = signal<ContadorPendencias>({ aguardandoVoce: 0, abertas: 0 });
    readonly contadorAdmin = signal<ContadorPendencias>({ aguardandoVoce: 0, abertas: 0 });

    // ------------------------------------------------------------ denunciante

    tipos(): Observable<TipoDenunciaPublico[]> {
        return this.api.get('/app/denuncias/tipos');
    }

    denunciar(imovelId: number, tipoId: number, descricao: string): Observable<MinhaDenuncia> {
        return this.api.post('/app/denuncias', { imovelId, tipoId, descricao });
    }

    minhas(): Observable<MinhaDenuncia[]> {
        return this.api.get('/app/denuncias/minhas');
    }

    // ------------------------------------------------------------ anunciante

    pendencias(abertas = true): Observable<GrupoPendencias[]> {
        return this.api.get('/app/anunciante/pendencias', { abertas });
    }

    pendenciasDoImovel(imovelId: number): Observable<PendenciasImovel> {
        return this.api.get(`/app/anunciante/pendencias/${imovelId}`);
    }

    responder(denuncias: number[], texto: string, anexos: string[] = []): Observable<void> {
        return this.api.post<void>('/app/anunciante/pendencias/responder', { denuncias, texto, anexos }).pipe(tap(() => this.atualizarContadorAnunciante()));
    }

    atualizarContadorAnunciante() {
        this.api
            .get<ContadorPendencias>('/app/anunciante/pendencias/contador')
            .pipe(catchError(() => of(null)))
            .subscribe((c) => c && this.contadorAnunciante.set(c));
    }

    // ------------------------------------------------------------ administração

    grupos(filtro: FiltroDenuncias, page = 0, size = 20): Observable<PageResponse<GrupoPendencias>> {
        return this.api.get('/app/admin/moderacao/denuncias', { filtro, page, size });
    }

    pendenciasAdmin(imovelId: number): Observable<PendenciasImovel> {
        return this.api.get(`/app/admin/moderacao/imoveis/${imovelId}`);
    }

    acaoNoImovel(imovelId: number, acao: AcaoImovel, motivo: string | null): Observable<PendenciasImovel> {
        return this.api.post<PendenciasImovel>(`/app/admin/moderacao/imoveis/${imovelId}/acao`, { acao, motivo }).pipe(tap(() => this.atualizarContadorAdmin()));
    }

    mensagemAdmin(id: number, texto: string, interna: boolean, anexos: string[] = []): Observable<Denuncia> {
        return this.api.post(`/app/admin/moderacao/denuncias/${id}/mensagens`, { texto, interna, anexos });
    }

    aprovar(id: number, texto: string | null): Observable<Denuncia> {
        return this.api.post<Denuncia>(`/app/admin/moderacao/denuncias/${id}/aprovar`, { texto }).pipe(tap(() => this.atualizarContadorAdmin()));
    }

    improcedente(id: number, texto: string | null): Observable<Denuncia> {
        return this.api.post<Denuncia>(`/app/admin/moderacao/denuncias/${id}/improcedente`, { texto }).pipe(tap(() => this.atualizarContadorAdmin()));
    }

    /** Abre a apuração (o prazo do anunciante para). */
    abrirApuracao(id: number, texto: string, interna: boolean, prazoMinutos: number | null): Observable<Denuncia> {
        return this.api.post<Denuncia>(`/app/admin/moderacao/denuncias/${id}/apuracao`, { texto, interna, prazoMinutos }).pipe(tap(() => this.atualizarContadorAdmin()));
    }

    /** Julga procedente: medida no anúncio (correção, manter, suspender, remover) e penalidade na conta. */
    procedente(id: number, form: ProcedenteForm): Observable<Denuncia> {
        return this.api.post<Denuncia>(`/app/admin/moderacao/denuncias/${id}/procedente`, form).pipe(tap(() => this.atualizarContadorAdmin()));
    }

    /** Revê um julgamento encerrado: a denúncia volta para análise. */
    reabrir(id: number, form: ReaberturaForm): Observable<Denuncia> {
        return this.api.post<Denuncia>(`/app/admin/moderacao/denuncias/${id}/reabrir`, form).pipe(tap(() => this.atualizarContadorAdmin()));
    }

    atualizarContadorAdmin() {
        this.api
            .get<ContadorPendencias>('/app/admin/moderacao/denuncias/contador')
            .pipe(catchError(() => of(null)))
            .subscribe((c) => c && this.contadorAdmin.set(c));
    }

    config(): Observable<ModeracaoConfig> {
        return this.api.get('/app/admin/moderacao/config');
    }

    salvarConfig(c: ModeracaoConfig): Observable<ModeracaoConfig> {
        return this.api.put('/app/admin/moderacao/config', c);
    }

    gravidades(): Observable<Gravidade[]> {
        return this.api.get('/app/admin/moderacao/gravidades');
    }

    salvarGravidade(g: Omit<Gravidade, 'id'> & { id?: number | null }): Observable<Gravidade> {
        const { id, ...corpo } = g;
        return id ? this.api.put(`/app/admin/moderacao/gravidades/${id}`, corpo) : this.api.post('/app/admin/moderacao/gravidades', corpo);
    }

    excluirGravidade(id: number): Observable<void> {
        return this.api.delete(`/app/admin/moderacao/gravidades/${id}`);
    }

    tiposAdmin(): Observable<TipoDenuncia[]> {
        return this.api.get('/app/admin/moderacao/tipos');
    }

    salvarTipo(t: Omit<TipoDenuncia, 'id' | 'gravidade'> & { id?: number | null; gravidadeId: number }): Observable<TipoDenuncia> {
        const { id, ...corpo } = t;
        return id ? this.api.put(`/app/admin/moderacao/tipos/${id}`, corpo) : this.api.post('/app/admin/moderacao/tipos', corpo);
    }

    excluirTipo(id: number): Observable<void> {
        return this.api.delete(`/app/admin/moderacao/tipos/${id}`);
    }

    // ------------------------------------------------------------ calendário

    calendario(): Observable<Calendario> {
        return this.api.get('/app/admin/calendario');
    }

    salvarExpediente(fuso: string, dias: DiaExpediente[]): Observable<Calendario> {
        return this.api.put('/app/admin/calendario/expediente', { fuso, dias });
    }

    salvarFeriado(f: Omit<Feriado, 'id'> & { id?: number | null }): Observable<Feriado> {
        const { id, ...corpo } = f;
        return id ? this.api.put(`/app/admin/calendario/feriados/${id}`, corpo) : this.api.post('/app/admin/calendario/feriados', corpo);
    }

    excluirFeriado(id: number): Observable<void> {
        return this.api.delete(`/app/admin/calendario/feriados/${id}`);
    }

    simular(minutos: number, inicio?: string | null): Observable<{ inicio: string; minutos: number; prazo: string | null }> {
        return this.api.get('/app/admin/calendario/simular', { minutos, inicio });
    }
}
