import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Financeira, FinanceiraForm } from '@/app/core/models/models';

/** Financeiras: cadastro (administração) e lista das ativas (formulário do anúncio). */
@Injectable({ providedIn: 'root' })
export class FinanceiraService {
    private api = inject(ApiService);

    ativas(): Observable<Financeira[]> {
        return this.api.get('/app/public/financeiras');
    }

    listar(): Observable<Financeira[]> {
        return this.api.get('/app/admin/financeiras');
    }

    criar(form: FinanceiraForm): Observable<Financeira> {
        return this.api.post('/app/admin/financeiras', form);
    }

    atualizar(id: number, form: FinanceiraForm): Observable<Financeira> {
        return this.api.put(`/app/admin/financeiras/${id}`, form);
    }

    excluir(id: number): Observable<void> {
        return this.api.delete(`/app/admin/financeiras/${id}`);
    }
}
