import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Finalidade, ImovelFiltro, OpcoesBusca, TIPOS, TipoImovel } from '@/app/core/models/models';
import { ImovelService } from '@/app/core/services/imovel.service';

export type AbaBusca = 'VENDA' | 'ALUGUEL' | 'NOVO' | 'TEMPORADA';

/**
 * Formulário de busca reutilizável.
 *  - variante "lateral": coluna da página de resultados;
 *  - variante "hero": caixa larga da página inicial.
 */
@Component({
    selector: 'app-filtros-busca',
    imports: [ReactiveFormsModule, SelectModule, InputNumberModule, InputTextModule, ButtonModule, IconFieldModule, InputIconModule],
    template: `
        <form class="filtros" [class.filtros--hero]="variante() === 'hero'" [formGroup]="form" (ngSubmit)="enviar()" role="search" aria-label="Buscar imóveis">
            <div class="filtros__abas" role="tablist" aria-label="Finalidade">
                @for (a of abas; track a.value) {
                    <button type="button" role="tab" class="filtros__aba" [class.ativa]="aba() === a.value" [attr.aria-selected]="aba() === a.value" (click)="aba.set(a.value)">{{ a.label }}</button>
                }
            </div>

            <div class="filtros__campos">
                <p-select [options]="tipos" formControlName="tipo" optionLabel="label" optionValue="value" placeholder="Tipo (todos)" [showClear]="true" styleClass="w-full" ariaLabel="Tipo de imóvel" />
                <p-select [options]="ufs()" formControlName="uf" placeholder="UF" [showClear]="true" styleClass="w-full" ariaLabel="Estado" />
                <p-select [options]="cidades()" formControlName="cidade" placeholder="Cidade (todas)" [showClear]="true" [filter]="true" filterPlaceholder="Filtrar" styleClass="w-full" ariaLabel="Cidade" />
                <p-select [options]="bairros()" formControlName="bairro" placeholder="Bairro (todos)" [showClear]="true" [filter]="true" filterPlaceholder="Filtrar" styleClass="w-full" ariaLabel="Bairro" />
                <div class="grid grid-cols-2 gap-2 filtros__dupla">
                    <p-select [options]="quartosOpcoes" formControlName="quartos" optionLabel="label" optionValue="value" placeholder="Quartos" [showClear]="true" styleClass="w-full" ariaLabel="Quartos" />
                    <p-inputnumber formControlName="precoMax" mode="currency" currency="BRL" locale="pt-BR" [maxFractionDigits]="0" placeholder="Valor até" styleClass="w-full" inputStyleClass="w-full" ariaLabel="Valor máximo" />
                </div>
                <p-iconfield class="filtros__texto">
                    <p-inputicon class="pi pi-search" />
                    <input pInputText type="text" formControlName="q" placeholder="Endereço, bairro ou código" class="w-full" aria-label="Busca por texto: endereço, bairro ou código" />
                </p-iconfield>
            </div>
            <p-button type="submit" label="Pesquisar" icon="pi pi-search" iconPos="right" styleClass="filtros__botao" />
        </form>
    `
})
export class FiltrosBusca {
    private imoveis = inject(ImovelService);

    variante = input<'lateral' | 'hero'>('lateral');
    valor = input<ImovelFiltro>({});
    buscar = output<ImovelFiltro>();

    abas: { value: AbaBusca; label: string }[] = [
        { value: 'VENDA', label: 'Venda' },
        { value: 'ALUGUEL', label: 'Aluguel' },
        { value: 'NOVO', label: 'Imóvel Novo' },
        { value: 'TEMPORADA', label: 'Temporada' }
    ];
    tipos = TIPOS;
    quartosOpcoes = [1, 2, 3, 4].map((n) => ({ value: n, label: `${n}+ quarto${n > 1 ? 's' : ''}` }));

    aba = signal<AbaBusca>('VENDA');
    opcoes = signal<OpcoesBusca>({ tipos: [], localidades: [] });

    form = new FormGroup({
        tipo: new FormControl<TipoImovel | null>(null),
        uf: new FormControl<string | null>(null),
        cidade: new FormControl<string | null>(null),
        bairro: new FormControl<string | null>(null),
        quartos: new FormControl<number | null>(null),
        precoMax: new FormControl<number | null>(null),
        q: new FormControl<string | null>(null)
    });

    private ufSel = toSignal(this.form.controls.uf.valueChanges, { initialValue: null as string | null });
    private cidadeSel = toSignal(this.form.controls.cidade.valueChanges, { initialValue: null as string | null });

    ufs = computed(() => [...new Set(this.opcoes().localidades.map((l) => l.uf))]);
    cidades = computed(() => {
        const uf = this.ufSel();
        return [...new Set(this.opcoes().localidades.filter((l) => !uf || l.uf === uf).map((l) => l.cidade))];
    });
    bairros = computed(() => {
        const cidade = this.cidadeSel();
        const locs = this.opcoes().localidades.filter((l) => !cidade || l.cidade === cidade);
        return [...new Set(locs.flatMap((l) => l.bairros))].sort((a, b) => a.localeCompare(b));
    });

    constructor() {
        this.imoveis.opcoes().subscribe({ next: (o) => this.opcoes.set(o), error: () => undefined });
        effect(() => {
            const v = this.valor();
            this.aba.set(v.lancamento ? 'NOVO' : ((v.finalidade as AbaBusca) ?? 'VENDA'));
            this.form.setValue(
                {
                    tipo: v.tipo?.[0] ?? null,
                    uf: v.uf ?? null,
                    cidade: v.cidade ?? null,
                    bairro: v.bairro ?? null,
                    quartos: v.quartos ?? null,
                    precoMax: v.precoMax ?? null,
                    q: v.q ?? null
                },
                { emitEvent: false }
            );
        });
        this.form.controls.uf.valueChanges.subscribe(() => this.form.patchValue({ cidade: null, bairro: null }));
        this.form.controls.cidade.valueChanges.subscribe(() => this.form.controls.bairro.setValue(null, { emitEvent: false }));
    }

    enviar() {
        const aba = this.aba();
        const finalidade: Finalidade = aba === 'NOVO' ? 'VENDA' : aba;
        const v = this.form.getRawValue();
        this.buscar.emit({
            finalidade,
            lancamento: aba === 'NOVO' ? true : null,
            tipo: v.tipo ? [v.tipo] : null,
            uf: v.uf,
            cidade: v.cidade,
            bairro: v.bairro,
            quartos: v.quartos,
            precoMax: v.precoMax,
            q: v.q?.trim() || null,
            page: 0
        });
    }
}
