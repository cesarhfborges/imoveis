import { AnuncianteFoto } from '@/app/shared/components/anunciante-foto';
import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImovelResumo } from '@/app/core/models/models';
import { PrecoPipe, TempoAtrasPipe, ValorM2Pipe, slug } from '@/app/core/pipes/formatos';
import { ImovelFoto } from './imovel-foto';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';

/**
 * Cartão horizontal de resultado de busca: foto à esquerda com selos,
 * endereço/título, preço e valor do m², características em "pílulas",
 * resumo, anunciante e ações (favoritar e contatar). Empilha no celular.
 */
@Component({
    selector: 'app-imovel-card',
    imports: [RouterLink, ImovelFoto, PrecoPipe, ValorM2Pipe, TempoAtrasPipe, AnuncianteFoto],
    template: `
        <article class="imovel-card group">
            <a [routerLink]="link()" [attr.target]="alvo()" [attr.rel]="alvo() ? 'noopener' : null" class="imovel-card__foto" [attr.aria-label]="'Ver ' + endereco() + (alvo() ? ' (abre em nova janela)' : '')">
                <app-imovel-foto class="w-full h-full" [src]="imovel().fotoCapa" [tipo]="imovel().tipo" [semente]="imovel().id" [alt]="imovel().titulo" />
                @if (imovel().lancamento) {
                    <span class="imovel-card__selo imovel-card__selo--topo">Imóvel novo</span>
                }
                @if (imovel().destaque) {
                    <span class="imovel-card__selo imovel-card__selo--verde">Destaque</span>
                }
                @if (imovel().fotoCapaIa) {
                    <span class="selo-origem-foto ia selo-origem-foto--canto" title="Foto de capa criada ou alterada com IA"><i class="pi pi-sparkles" aria-hidden="true"></i> IA</span>
                }
                @if (imovel().aceitaFinanciamento) {
                    <span class="imovel-card__financia"><i class="pi pi-wallet" aria-hidden="true"></i> Aceita financiamento</span>
                }
                @if (imovel().totalFotos > 1) {
                    <span class="imovel-card__fotos"><i class="pi pi-camera"></i> {{ imovel().totalFotos }}</span>
                }
            </a>
            <div class="imovel-card__corpo">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <a [routerLink]="link()" [attr.target]="alvo()" [attr.rel]="alvo() ? 'noopener' : null" class="imovel-card__endereco">{{ endereco() }}@if (alvo()) {<span class="sr-only"> (abre em nova janela)</span>}</a>
                        <a [routerLink]="link()" [attr.target]="alvo()" [attr.rel]="alvo() ? 'noopener' : null" class="imovel-card__titulo">{{ imovel().titulo }}@if (alvo()) {<span class="sr-only"> (abre em nova janela)</span>}</a>
                    </div>
                    <button type="button" class="imovel-card__fav" [class.ativo]="favorito()" (click)="favoritar.emit(imovel())" [attr.aria-label]="favorito() ? 'Remover dos favoritos' : 'Salvar nos favoritos'" [attr.aria-pressed]="favorito()">
                        <i class="pi" [class.pi-heart-fill]="favorito()" [class.pi-heart]="!favorito()"></i>
                    </button>
                </div>

                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                    <span class="imovel-card__preco">{{ imovel().preco | preco: imovel().finalidade }}</span>
                    @if (imovel().finalidade === 'VENDA' && imovel().areaUtil) {
                        <span class="text-sm text-muted-color"
                            >Valor m² <strong class="text-color">{{ imovel().preco | valorM2: imovel().areaUtil }}</strong></span
                        >
                    }
                    <span class="flex flex-wrap gap-1.5">
                        @if (imovel().areaUtil) {
                            <span class="pilula">{{ imovel().areaUtil }} m²</span>
                        }
                        @if (imovel().quartos) {
                            <span class="pilula">{{ imovel().quartos }} {{ imovel().quartos === 1 ? 'Quarto' : 'Quartos' }}</span>
                        }
                        @if (imovel().suites) {
                            <span class="pilula">{{ imovel().suites }} {{ imovel().suites === 1 ? 'Suíte' : 'Suítes' }}</span>
                        }
                        @if (imovel().vagas) {
                            <span class="pilula">{{ imovel().vagas }} {{ imovel().vagas === 1 ? 'Vaga' : 'Vagas' }}</span>
                        }
                    </span>
                </div>

                @if (imovel().descricaoCurta) {
                    <p class="imovel-card__descricao">{{ imovel().descricaoCurta }}</p>
                }
                <p class="text-xs text-muted-color mt-1">{{ imovel().tipoDescricao }} · {{ imovel().codigo }} · publicado {{ imovel().criadoEm | tempoAtras }}</p>

                <div class="flex items-center gap-4 mt-auto pt-3">
                    <app-anunciante-foto [nome]="imovel().anuncianteNome" [foto]="imovel().anuncianteFoto" />
                    <div class="text-sm leading-tight">
                        <div class="text-red-600 dark:text-red-400 text-xs">Creci:</div>
                        <div>{{ imovel().anuncianteCreci || '—' }}</div>
                    </div>
                    <button type="button" class="botao-contorno" (click)="contatar.emit(imovel())">contatar</button>
                </div>
            </div>
        </article>
    `
})
export class ImovelCard {
    private auth = inject(AuthService);
    imovel = input.required<ImovelResumo>();
    favorito = input(false);
    favoritar = output<ImovelResumo>();
    contatar = output<ImovelResumo>();

    alvo = inject(ConfigService).alvoAnuncio;
    link = computed(() => ['/imovel', this.imovel().id, slug(this.imovel().titulo)]);
    endereco = computed(() => {
        const i = this.imovel();
        return [i.endereco, i.numero, i.bairro, i.cidade].filter(Boolean).join(', ');
    });
}
