import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonModule } from 'primeng/button';
import { ContagemTipo, TipoImovel } from '@/app/core/models/models';

/** Lista "Tipos" com a quantidade de anúncios de cada um (coluna da busca). */
@Component({
    selector: 'app-tipos-contagem',
    imports: [ReactiveFormsModule, RadioButtonModule, ButtonModule],
    template: `
        <section class="painel-lateral" aria-labelledby="tipos-titulo">
            <h2 id="tipos-titulo" class="text-lg font-semibold mb-3">Tipos</h2>
            <ul class="list-none p-0 m-0 flex flex-col gap-1.5">
                @for (t of tipos(); track t.tipo) {
                    <li class="flex items-center justify-between gap-2 text-sm">
                        <label class="flex items-center gap-2 cursor-pointer uppercase">
                            <p-radiobutton name="tipo-contagem" [value]="t.tipo" [formControl]="escolhido" [inputId]="'tc-' + t.tipo" />
                            <span>{{ t.label }}</span>
                        </label>
                        <span class="text-muted-color">({{ t.total }})</span>
                    </li>
                }
            </ul>
            <div class="flex justify-center gap-2 mt-4">
                <p-button label="Aplicar" [outlined]="true" size="small" (onClick)="aplicar.emit(escolhido.value)" />
                @if (escolhido.value) {
                    <p-button label="Limpar" [text]="true" size="small" (onClick)="escolhido.setValue(null); aplicar.emit(null)" />
                }
            </div>
        </section>
    `
})
export class TiposContagem {
    tipos = input<ContagemTipo[]>([]);
    escolhido = new FormControl<TipoImovel | null>(null);
    aplicar = output<TipoImovel | null>();
}
