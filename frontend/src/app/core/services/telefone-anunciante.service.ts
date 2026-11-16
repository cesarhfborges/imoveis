import { Injectable, Signal, WritableSignal, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ImovelService } from './imovel.service';
import { AnuncianteService } from './anunciante.service';
import { digitos } from '@/app/core/pipes/formatos';

/** De onde vem o telefone: do anúncio (/imoveis/{id}/telefone) ou do perfil (/anunciantes/{id}/telefone). */
export interface OrigemTelefone {
    tipo: 'imovel' | 'anunciante';
    id: number;
}

/** Telefones de anunciantes já revelados ("Ver telefone"), por anúncio/perfil, para não pedir de novo à API. */
@Injectable({ providedIn: 'root' })
export class TelefoneAnuncianteService {
    private imoveis = inject(ImovelService);
    private anunciantes = inject(AnuncianteService);
    private numeros = new Map<string, WritableSignal<string | null>>();
    private whatsapps = new Map<string, WritableSignal<string | null>>();
    private pedindo = new Map<string, WritableSignal<boolean>>();

    numero(o: OrigemTelefone): Signal<string | null> {
        return this.slot(this.numeros, chave(o), null);
    }

    /** Só no perfil: o WhatsApp vem junto com o telefone revelado. */
    whatsapp(o: OrigemTelefone): Signal<string | null> {
        return this.slot(this.whatsapps, chave(o), null);
    }

    carregando(o: OrigemTelefone): Signal<boolean> {
        return this.slot(this.pedindo, chave(o), false);
    }

    async revelar(o: OrigemTelefone): Promise<void> {
        const k = chave(o);
        const numero = this.slot(this.numeros, k, null);
        const pedindo = this.slot(this.pedindo, k, false);
        if (numero() || pedindo()) return;
        pedindo.set(true);
        try {
            const pedido: Observable<{ telefone: string; whatsapp?: string | null }> = o.tipo === 'imovel' ? this.imoveis.telefoneAnunciante(o.id) : this.anunciantes.telefone(o.id);
            const r = await firstValueFrom(pedido);
            this.slot(this.whatsapps, k, null).set(digitos(r.whatsapp) || null);
            numero.set(digitos(r.telefone) || null);
        } finally {
            pedindo.set(false);
        }
    }

    private slot<T>(mapa: Map<string, WritableSignal<T>>, k: string, inicial: T): WritableSignal<T> {
        let s = mapa.get(k);
        if (!s) {
            s = signal(inicial);
            mapa.set(k, s);
        }
        return s;
    }
}

function chave(o: OrigemTelefone): string {
    return `${o.tipo}:${o.id}`;
}
