import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Contato, ContatoForm, ContagemTipo, EstatisticasAnuncios, ImovelDetalhe, ImovelFiltro, ImovelForm, ImovelResumo, OpcoesBusca, PageResponse, StatusAnuncio } from '@/app/core/models/models';

/** Consulta pública de anúncios (sem login). */
@Injectable({ providedIn: 'root' })
export class ImovelService {
    private api = inject(ApiService);
    private base = '/app/public/imoveis';

    buscar(f: ImovelFiltro): Observable<PageResponse<ImovelResumo>> {
        return this.api.get(this.base, f);
    }

    destaques(limite = 8): Observable<ImovelResumo[]> {
        return this.api.get(`${this.base}/destaques`, { limite });
    }

    opcoes(): Observable<OpcoesBusca> {
        return this.api.get(`${this.base}/opcoes`);
    }

    contagemTipos(f: ImovelFiltro): Observable<ContagemTipo[]> {
        return this.api.get(`${this.base}/contagem-tipos`, f);
    }

    mapa(f: ImovelFiltro): Observable<ImovelResumo[]> {
        return this.api.get(`${this.base}/mapa`, f);
    }

    detalhe(id: number): Observable<ImovelDetalhe> {
        return this.api.get(`${this.base}/${id}`);
    }

    similares(id: number): Observable<ImovelResumo[]> {
        return this.api.get(`${this.base}/${id}/similares`);
    }

    /** Telefone completo do anunciante (exige login no modo MOSTRAR_APENAS_LOGADO). */
    telefoneAnunciante(id: number): Observable<{ telefone: string }> {
        return this.api.get(`${this.base}/${id}/telefone`);
    }

    contatar(id: number, form: ContatoForm): Observable<Contato> {
        return this.api.post(`${this.base}/${id}/contato`, form);
    }
}

export type AreaGestao = 'corretor' | 'admin';

/** Gestão de anúncios: "corretor" (somente os próprios) ou "admin" (todos). */
@Injectable({ providedIn: 'root' })
export class GestaoAnunciosService {
    private api = inject(ApiService);

    listar(area: AreaGestao, f: ImovelFiltro): Observable<PageResponse<ImovelResumo>> {
        return this.api.get(`/app/${area}/imoveis`, f);
    }

    obter(area: AreaGestao, id: number): Observable<ImovelDetalhe> {
        return this.api.get(`/app/${area}/imoveis/${id}`);
    }

    criar(area: AreaGestao, form: ImovelForm): Observable<ImovelDetalhe> {
        return this.api.post(`/app/${area}/imoveis`, form);
    }

    atualizar(area: AreaGestao, id: number, form: ImovelForm): Observable<ImovelDetalhe> {
        return this.api.put(`/app/${area}/imoveis/${id}`, form);
    }

    status(area: AreaGestao, id: number, status: StatusAnuncio, destaque?: boolean): Observable<ImovelDetalhe> {
        return this.api.patch(`/app/${area}/imoveis/${id}/status`, { status, destaque });
    }

    excluir(area: AreaGestao, id: number): Observable<void> {
        return this.api.delete(`/app/${area}/imoveis/${id}`);
    }

    estatisticas(area: AreaGestao): Observable<EstatisticasAnuncios> {
        return this.api.get(`/app/${area}/anuncios/estatisticas`);
    }

    contatos(area: AreaGestao, page = 0, size = 20): Observable<PageResponse<Contato>> {
        return this.api.get(`/app/${area}/contatos`, { page, size });
    }

    marcarLido(area: AreaGestao, id: number, lido: boolean): Observable<Contato> {
        return this.api.patch(`/app/${area}/contatos/${id}`, {}, { lido });
    }
}
