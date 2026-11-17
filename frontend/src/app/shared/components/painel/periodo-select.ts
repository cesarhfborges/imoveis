import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { PeriodoPainel } from '@/app/core/models/models';

/** Escolha do período dos gráficos do painel (7, 30 ou 90 dias). */
@Component({
    selector: 'app-periodo-select',
    imports: [FormsModule, SelectButtonModule],
    template: `
        <span id="periodo-painel" class="sr-only">Período dos gráficos</span>
        <p-selectbutton [options]="opcoes" optionLabel="label" optionValue="value" [allowEmpty]="false" [ngModel]="periodo()" (ngModelChange)="periodo.set($event)" ariaLabelledBy="periodo-painel" size="small" />
    `
})
export class PeriodoSelect {
    periodo = model<PeriodoPainel>(30);
    opcoes: { label: string; value: PeriodoPainel }[] = [
        { label: '7 dias', value: 7 },
        { label: '30 dias', value: 30 },
        { label: '90 dias', value: 90 }
    ];
}
