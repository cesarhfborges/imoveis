import { Component, computed, input } from '@angular/core';
import { MembroSala } from '@/app/core/services/realtime.service';

/** Indicador "ao vivo" e quem mais está na sala (canal protegido). */
@Component({
    selector: 'app-presenca-sala',
    template: `
        @if (conectado()) {
            <span class="inline-flex items-center gap-2 text-sm" role="status">
                <span class="relative flex w-2.5 h-2.5" aria-hidden="true">
                    <span class="absolute inline-flex w-full h-full rounded-full bg-green-500 opacity-60 motion-safe:animate-ping"></span>
                    <span class="relative inline-flex w-2.5 h-2.5 rounded-full bg-green-600"></span>
                </span>
                <span class="text-muted-color">Ao vivo</span>
                @if (texto()) {
                    <span class="font-medium">· {{ texto() }}</span>
                }
            </span>
        }
    `
})
export class PresencaSala {
    conectado = input(false);
    /** Pessoas na sala, já sem o próprio usuário. */
    outros = input<MembroSala[]>([]);
    /** Como descrever os outros (ex.: "Moderação online agora"). */
    descrever = input<((outros: MembroSala[]) => string | null) | null>(null);

    texto = computed(() => {
        const f = this.descrever();
        const o = this.outros();
        if (f) return f(o);
        return o.length ? 'Também aqui: ' + o.map((m) => m.nome.split(' ')[0]).join(', ') : null;
    });
}
