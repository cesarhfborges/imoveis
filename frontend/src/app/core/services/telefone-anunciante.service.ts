import { Injectable, Signal, WritableSignal, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ImovelService } from './imovel.service';
import { digitos } from '@/app/core/pipes/formatos';

/** Telefones de anunciantes já revelados ("Ver telefone"), por anúncio, para não pedir de novo à API. */
@Injectable({ providedIn: 'root' })
export class TelefoneAnuncianteService {
    private imoveis = inject(ImovelService);
    private numeros = new Map<number, WritableSignal<string | null>>();
    private pedindo = new Map<number, WritableSignal<boolean>>();

    numero(imovelId: number): Signal<string | null> {
        return this.slot(this.numeros, imovelId, null);
    }

    carregando(imovelId: number): Signal<boolean> {
        return this.slot(this.pedindo, imovelId, false);
    }

    async revelar(imovelId: number): Promise<void> {
        const numero = this.slot(this.numeros, imovelId, null);
        const pedindo = this.slot(this.pedindo, imovelId, false);
        if (numero() || pedindo()) return;
        pedindo.set(true);
        try {
            const r = await firstValueFrom(this.imoveis.telefoneAnunciante(imovelId));
            numero.set(digitos(r.telefone) || null);
        } finally {
            pedindo.set(false);
        }
    }

    private slot<T>(mapa: Map<number, WritableSignal<T>>, id: number, inicial: T): WritableSignal<T> {
        let s = mapa.get(id);
        if (!s) {
            s = signal(inicial);
            mapa.set(id, s);
        }
        return s;
    }
}
