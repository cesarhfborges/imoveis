import { Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { AvisoPublico } from '@/app/core/models/models';
import { TextoRicoView } from './texto-rico';

type Pos = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
type PosDrawer = 'left' | 'right' | 'top' | 'bottom' | 'full';

/**
 * Um aviso do site desenhado conforme o tipo:
 *  - MENSAGEM: p-message (quem usa decide onde fica: barra fixa no site ou embutida na pré-visualização);
 *  - DIALOG: p-dialog na posição escolhida;
 *  - DRAWER: p-drawer na borda escolhida.
 * Emite (aceito) no botão principal e (dispensado) quando fechado sem aceitar.
 */
@Component({
    selector: 'app-aviso-view',
    imports: [NgTemplateOutlet, MessageModule, DialogModule, DrawerModule, ButtonModule, TextoRicoView],
    template: `
        <ng-template #conteudo>
            <div class="aviso__texto">
                @if (aviso().tipo === 'MENSAGEM' && aviso().titulo) {
                    <strong class="aviso__titulo">{{ aviso().titulo }}</strong>
                }
                <app-texto-rico [texto]="aviso().mensagem" />
            </div>
        </ng-template>
        <ng-template #botoes>
            <div class="aviso__botoes">
                @if (aviso().textoLink && aviso().urlLink) {
                    <a [href]="aviso().urlLink" class="aviso__link" target="_blank" rel="noopener">{{ aviso().textoLink }}<span class="sr-only"> (abre em nova aba)</span></a>
                }
                @if (aviso().dispensavel && aviso().tipo !== 'MENSAGEM' && aviso().textoAceite) {
                    <p-button label="Agora não" [text]="true" severity="secondary" size="small" (onClick)="dispensado.emit()" />
                }
                @if (aviso().textoAceite) {
                    <p-button [label]="aviso().textoAceite!" size="small" [severity]="corBotao()" [icon]="aviso().acaoAceite === 'LINK' ? 'pi pi-arrow-right' : 'pi pi-check'" iconPos="right" (onClick)="aceito.emit()" />
                }
            </div>
        </ng-template>

        @switch (aviso().tipo) {
            @case ('MENSAGEM') {
                <p-message [severity]="aviso().severidade" [icon]="icone() ?? undefined" [closable]="aviso().dispensavel" (onClose)="dispensado.emit()" styleClass="aviso-mensagem">
                    <div class="aviso__linha">
                        <ng-container [ngTemplateOutlet]="conteudo" />
                        <ng-container [ngTemplateOutlet]="botoes" />
                    </div>
                </p-message>
            }
            @case ('DIALOG') {
                <p-dialog
                    [visible]="visivel()"
                    (visibleChange)="!$event && dispensado.emit()"
                    [header]="aviso().titulo || ''"
                    [position]="posicaoDialog()"
                    [modal]="aviso().modal"
                    [closable]="aviso().dispensavel"
                    [closeOnEscape]="aviso().dispensavel"
                    [dismissableMask]="aviso().dispensavel"
                    [draggable]="false"
                    [style]="{ width: '34rem', maxWidth: '94vw' }"
                    [styleClass]="'aviso-dialog aviso-cor--' + aviso().severidade"
                    [appendTo]="'body'"
                >
                    <div class="aviso__corpo">
                        @if (icone()) {
                            <span class="aviso__icone" aria-hidden="true"><i [class]="icone()"></i></span>
                        }
                        <ng-container [ngTemplateOutlet]="conteudo" />
                    </div>
                    <ng-template #footer><ng-container [ngTemplateOutlet]="botoes" /></ng-template>
                </p-dialog>
            }
            @case ('DRAWER') {
                <p-drawer
                    [visible]="visivel()"
                    (visibleChange)="!$event && dispensado.emit()"
                    [header]="aviso().titulo || ''"
                    [position]="posicaoDrawer()"
                    [modal]="aviso().modal"
                    [closable]="aviso().dispensavel"
                    [dismissible]="aviso().dispensavel"
                    [closeOnEscape]="aviso().dispensavel"
                    [styleClass]="classeDrawer()"
                    [appendTo]="'body'"
                >
                    <div class="aviso__corpo">
                        @if (icone()) {
                            <span class="aviso__icone" aria-hidden="true"><i [class]="icone()"></i></span>
                        }
                        <ng-container [ngTemplateOutlet]="conteudo" />
                    </div>
                    <ng-template #footer><ng-container [ngTemplateOutlet]="botoes" /></ng-template>
                </p-drawer>
            }
        }
    `,
    styles: `
        /* ---------------- conteúdo (todos os tipos) */
        .aviso__texto {
            flex: 1 1 auto;
            min-width: 0;
            line-height: 1.55;
            overflow-wrap: anywhere;
        }
        .aviso__titulo {
            display: block;
            font-size: 1rem;
            margin-bottom: 0.2rem;
        }
        .aviso__texto ::ng-deep p {
            margin: 0 0 0.5rem;
        }
        .aviso__texto ::ng-deep p:last-child {
            margin-bottom: 0;
        }
        .aviso__botoes {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: flex-end;
            gap: 0.5rem 0.75rem;
        }
        .aviso__link {
            font-size: 0.875rem;
            color: inherit;
            text-decoration: underline;
            text-underline-offset: 2px;
        }
        .aviso__corpo {
            display: flex;
            gap: 1rem;
            align-items: flex-start;
            min-width: 0;
        }
        .aviso__icone {
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2.75rem;
            height: 2.75rem;
            border-radius: 50%;
            font-size: 1.2rem;
            color: var(--aviso-solido-texto, #fff);
            background: var(--aviso-solido, var(--p-primary-color));
        }

        /*
         * Paleta de cada cor (diálogo e drawer; a mensagem usa as cores do p-message). Fica global porque o
         * diálogo e o drawer são anexados ao body.
         *   --aviso-fundo/--aviso-texto: faixa do cabeçalho  --aviso-borda: linhas  --aviso-solido: ícone
         */
        ::ng-deep .aviso-cor--info {
            --aviso-fundo: var(--p-blue-50);
            --aviso-texto: var(--p-blue-800);
            --aviso-borda: var(--p-blue-200);
            --aviso-solido: var(--p-blue-600);
        }
        ::ng-deep .aviso-cor--success {
            --aviso-fundo: var(--p-green-50);
            --aviso-texto: var(--p-green-800);
            --aviso-borda: var(--p-green-200);
            --aviso-solido: var(--p-green-600);
        }
        ::ng-deep .aviso-cor--warn {
            --aviso-fundo: var(--p-amber-50);
            --aviso-texto: var(--p-amber-900);
            --aviso-borda: var(--p-amber-300);
            --aviso-solido: var(--p-amber-500);
            --aviso-solido-texto: var(--p-amber-950);
        }
        ::ng-deep .aviso-cor--error {
            --aviso-fundo: var(--p-red-50);
            --aviso-texto: var(--p-red-800);
            --aviso-borda: var(--p-red-200);
            --aviso-solido: var(--p-red-600);
        }
        ::ng-deep .aviso-cor--secondary {
            --aviso-fundo: var(--p-surface-100);
            --aviso-texto: var(--p-surface-800);
            --aviso-borda: var(--p-surface-300);
            --aviso-solido: var(--p-surface-600);
        }
        ::ng-deep .aviso-cor--contrast {
            --aviso-fundo: var(--p-surface-900);
            --aviso-texto: var(--p-surface-0);
            --aviso-borda: color-mix(in srgb, var(--p-surface-0), transparent 85%);
            --aviso-solido: color-mix(in srgb, var(--p-surface-0), transparent 85%);
            --aviso-solido-texto: var(--p-surface-0);
        }
        ::ng-deep .app-dark .aviso-cor--info {
            --aviso-fundo: color-mix(in srgb, var(--p-blue-400), transparent 84%);
            --aviso-texto: var(--p-blue-200);
            --aviso-borda: color-mix(in srgb, var(--p-blue-400), transparent 60%);
            --aviso-solido: var(--p-blue-500);
        }
        ::ng-deep .app-dark .aviso-cor--success {
            --aviso-fundo: color-mix(in srgb, var(--p-green-400), transparent 84%);
            --aviso-texto: var(--p-green-200);
            --aviso-borda: color-mix(in srgb, var(--p-green-400), transparent 60%);
            --aviso-solido: var(--p-green-500);
        }
        ::ng-deep .app-dark .aviso-cor--warn {
            --aviso-fundo: color-mix(in srgb, var(--p-amber-400), transparent 84%);
            --aviso-texto: var(--p-amber-200);
            --aviso-borda: color-mix(in srgb, var(--p-amber-400), transparent 60%);
        }
        ::ng-deep .app-dark .aviso-cor--error {
            --aviso-fundo: color-mix(in srgb, var(--p-red-400), transparent 84%);
            --aviso-texto: var(--p-red-200);
            --aviso-borda: color-mix(in srgb, var(--p-red-400), transparent 60%);
            --aviso-solido: var(--p-red-500);
        }
        ::ng-deep .app-dark .aviso-cor--secondary {
            --aviso-fundo: var(--p-surface-800);
            --aviso-texto: var(--p-surface-100);
            --aviso-borda: var(--p-surface-700);
            --aviso-solido: var(--p-surface-500);
        }
        ::ng-deep .app-dark .aviso-cor--contrast {
            --aviso-fundo: var(--p-surface-0);
            --aviso-texto: var(--p-surface-950);
            --aviso-borda: color-mix(in srgb, var(--p-surface-950), transparent 88%);
            --aviso-solido: color-mix(in srgb, var(--p-surface-950), transparent 90%);
            --aviso-solido-texto: var(--p-surface-950);
        }

        /* cabeçalho do diálogo/drawer na cor do aviso */
        ::ng-deep :is(.aviso-dialog .p-dialog-header, .aviso-drawer .p-drawer-header) {
            background: var(--aviso-fundo);
            color: var(--aviso-texto);
            border-bottom: 1px solid var(--aviso-borda);
            /* mais compacto que o padrão do PrimeNG */
            padding-block: 0.6rem;
            margin-bottom: 0.85rem;
            min-height: 0;
        }
        ::ng-deep :is(.aviso-dialog .p-dialog-title, .aviso-drawer .p-drawer-title) {
            color: inherit;
            font-size: 1.1rem;
            line-height: 1.3;
        }
        ::ng-deep :is(.aviso-dialog .p-dialog-close-button, .aviso-drawer .p-drawer-close-button) {
            width: 2rem;
            height: 2rem;
        }
        ::ng-deep :is(.aviso-dialog .p-dialog-close-button, .aviso-drawer .p-drawer-close-button) {
            color: inherit;
        }
        ::ng-deep .aviso-dialog.p-dialog {
            overflow: hidden;
        }

        /* contraste: o painel inteiro numa cor só (cabeçalho, texto e rodapé), sem faixa separada */
        ::ng-deep :is(.p-dialog, .p-drawer).aviso-cor--contrast {
            background: var(--aviso-fundo);
            color: var(--aviso-texto);
            border-color: var(--aviso-fundo);
        }
        ::ng-deep :is(.p-dialog, .p-drawer).aviso-cor--contrast :is(.p-dialog-header, .p-drawer-header, .p-dialog-content, .p-drawer-content, .p-dialog-footer, .p-drawer-footer) {
            background: transparent;
            color: var(--aviso-texto);
        }
        ::ng-deep :is(.p-dialog, .p-drawer).aviso-cor--contrast :is(.p-dialog-header, .p-drawer-header) {
            border-bottom-color: var(--aviso-borda);
        }
        ::ng-deep :is(.p-dialog, .p-drawer).aviso-cor--contrast :is(.p-dialog-close-button, .p-drawer-close-button) {
            color: var(--aviso-texto);
        }
        ::ng-deep :is(.p-dialog, .p-drawer).aviso-cor--contrast :is(.p-dialog-close-button, .p-drawer-close-button):hover {
            background: var(--aviso-solido);
        }
        ::ng-deep :is(.p-dialog, .p-drawer).aviso-cor--contrast .p-button-text {
            color: var(--aviso-texto);
            opacity: 0.85;
        }
        ::ng-deep :is(.p-dialog, .p-drawer).aviso-cor--contrast .p-button-text:hover {
            background: var(--aviso-solido);
            opacity: 1;
        }

        /* ---------------- mensagem (p-message): texto à esquerda, botões à direita; no celular, empilha */
        .aviso__linha {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.75rem 1.5rem;
            width: 100%;
            min-width: 0;
        }
        .aviso__linha .aviso__texto {
            flex: 1 1 24rem;
        }
        .aviso__linha .aviso__botoes {
            flex: 0 0 auto;
            margin-left: auto;
        }
        ::ng-deep .aviso-mensagem {
            box-shadow: 0 8px 28px rgba(15, 23, 42, 0.14);
        }
        ::ng-deep .aviso-mensagem .p-message-content {
            align-items: flex-start;
            padding: 0.9rem 1rem;
            gap: 0.75rem;
        }
        ::ng-deep .aviso-mensagem .p-message-text {
            flex: 1 1 auto;
            min-width: 0;
            font-weight: 400;
        }
        ::ng-deep .aviso-mensagem .p-message-icon {
            margin-top: 0.15rem;
            font-size: 1.15rem;
        }
        ::ng-deep .aviso-mensagem .p-message-close-button {
            margin-top: -0.2rem;
            flex-shrink: 0;
        }
        @media (max-width: 575px) {
            .aviso__linha .aviso__botoes {
                width: 100%;
                justify-content: flex-start;
                margin-left: 0;
            }
        }

        /* ---------------- diálogo */
        ::ng-deep .aviso-dialog .p-dialog-content {
            overflow-y: auto;
        }
        ::ng-deep .aviso-dialog .p-dialog-footer {
            padding-top: 0.25rem;
        }

        /* ---------------- drawer: a altura/largura acompanha o texto, com rolagem se passar do limite */
        ::ng-deep .aviso-drawer .p-drawer-content {
            overflow-y: auto;
        }
        ::ng-deep .p-drawer.aviso-drawer.aviso-drawer--lado {
            width: min(30rem, 100vw);
        }
        ::ng-deep .p-drawer.aviso-drawer.aviso-drawer--faixa {
            height: auto;
            max-height: 85vh;
        }
        /* em telas largas, o conteúdo da faixa fica numa coluna central de até 64rem */
        ::ng-deep .aviso-drawer--faixa :is(.p-drawer-header, .p-drawer-content, .p-drawer-footer) {
            padding-inline: max(1.25rem, calc((100vw - 64rem) / 2));
        }
        ::ng-deep .aviso-drawer--faixa .p-drawer-footer {
            padding-top: 0.5rem;
        }
    `
})
export class AvisoView {
    aviso = input.required<AvisoPublico>();
    /** Dialog/drawer: aberto? */
    visivel = input(true);

    aceito = output<void>();
    dispensado = output<void>();

    /**
     * Botão principal na cor do aviso. Cinza usa o botão escuro (destaca sem gritar); contraste, que pinta o
     * aviso inteiro de escuro (ou de claro no modo escuro), usa o botão do tom oposto.
     */
    corBotao = computed<'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast'>(() => {
        const a = this.aviso();
        switch (a.severidade) {
            case 'error':
                return 'danger';
            case 'secondary':
                return 'contrast';
            case 'contrast':
                // painel inteiro escuro (ou claro, no modo escuro): o botão é o oposto
                return 'secondary';
            default:
                return a.severidade;
        }
    });
    icone = computed(() => (this.aviso().icone ? 'pi ' + this.aviso().icone : null));
    posicaoDialog = computed(() => this.aviso().posicao as Pos);
    posicaoDrawer = computed(() => this.aviso().posicao as PosDrawer);
    classeDrawer = computed(() => {
        const p = this.aviso().posicao;
        return 'aviso-drawer aviso-cor--' + this.aviso().severidade + ' ' + (p === 'left' || p === 'right' ? 'aviso-drawer--lado' : p === 'full' ? 'aviso-drawer--cheio' : 'aviso-drawer--faixa');
    });
}
