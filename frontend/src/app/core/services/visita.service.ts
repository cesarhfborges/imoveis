import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DiaHorarios, Visita } from '@/app/core/models/models';

/** Agendamento de visitas: horários livres, visitas do cliente e visitas aos anúncios do anunciante. */
@Injectable({ providedIn: 'root' })
export class VisitaService {
    private api = inject(ApiService);

    horarios(imovelId: number): Observable<DiaHorarios[]> {
        return this.api.get(`/app/public/imoveis/${imovelId}/visitas/horarios`);
    }

    // ---- cliente
    minhas(): Observable<Visita[]> {
        return this.api.get('/app/conta/visitas');
    }

    pedir(imovelId: number, inicio: string, mensagem: string | null): Observable<Visita> {
        return this.api.post('/app/conta/visitas', { imovelId, inicio, mensagem });
    }

    aceitar(id: number): Observable<Visita> {
        return this.api.post(`/app/conta/visitas/${id}/aceitar`, {});
    }

    cancelar(id: number, mensagem: string | null): Observable<Visita> {
        return this.api.post(`/app/conta/visitas/${id}/cancelar`, { mensagem });
    }

    // ---- anunciante
    doAnunciante(): Observable<Visita[]> {
        return this.api.get('/app/corretor/visitas');
    }

    confirmar(id: number): Observable<Visita> {
        return this.api.post(`/app/corretor/visitas/${id}/confirmar`, {});
    }

    recusar(id: number, mensagem: string | null): Observable<Visita> {
        return this.api.post(`/app/corretor/visitas/${id}/recusar`, { mensagem });
    }

    propor(id: number, inicio: string, mensagem: string | null): Observable<Visita> {
        return this.api.post(`/app/corretor/visitas/${id}/propor`, { inicio, mensagem });
    }

    cancelarComoAnunciante(id: number, mensagem: string | null): Observable<Visita> {
        return this.api.post(`/app/corretor/visitas/${id}/cancelar`, { mensagem });
    }
}
