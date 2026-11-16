import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AnuncianteFiltro, AnunciantePerfil, AnuncianteResumo } from '@/app/core/models/models';

/** Diretório e perfil público de corretores e imobiliárias. */
@Injectable({ providedIn: 'root' })
export class AnuncianteService {
    private api = inject(ApiService);
    private base = '/app/public/anunciantes';

    listar(f: AnuncianteFiltro): Observable<AnuncianteResumo[]> {
        return this.api.get(this.base, f);
    }

    perfil(id: number): Observable<AnunciantePerfil> {
        return this.api.get(`${this.base}/${id}`);
    }

    /** Telefone e WhatsApp completos (exige login no modo MOSTRAR_APENAS_LOGADO). */
    telefone(id: number): Observable<{ telefone: string; whatsapp: string | null }> {
        return this.api.get(`${this.base}/${id}/telefone`);
    }
}
