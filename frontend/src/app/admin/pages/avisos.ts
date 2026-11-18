import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AreaAviso, Aviso, AvisoForm, AvisoPublico, POSICOES_AVISO, PublicoAviso, SEVERIDADES_AVISO, TIPOS_AVISO, TipoAviso } from '@/app/core/models/models';
import { AvisosService } from '@/app/core/services/avisos.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { EditorTexto, htmlVazio } from '@/app/shared/components/editor-texto';
import { AvisoView } from '@/app/shared/components/aviso-view';
import { TabelaResponsiva } from '@/app/shared/directives/tabela-responsiva';

const ICONES = [
    'pi-info-circle',
    'pi-exclamation-triangle',
    'pi-exclamation-circle',
    'pi-check-circle',
    'pi-shield',
    'pi-lock',
    'pi-megaphone',
    'pi-bell',
    'pi-question-circle',
    'pi-book',
    'pi-star',
    'pi-gift',
    'pi-heart',
    'pi-home',
    'pi-calendar',
    'pi-clock',
    'pi-wrench',
    'pi-cog',
    'pi-user',
    'pi-users',
    'pi-envelope',
    'pi-whatsapp',
    'pi-thumbs-up',
    'pi-flag'
];

const PUBLICOS: { value: PublicoAviso; label: string }[] = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'VISITANTES', label: 'Só visitantes (não logados)' },
    { value: 'LOGADOS', label: 'Só usuários logados' }
];

const AREAS: { value: AreaAviso; label: string; dica: string }[] = [
    { value: 'SITE', label: 'Site público', dica: 'Busca, anúncios e telas de login' },
    { value: 'CONTA', label: 'Painel do usuário', dica: '/conta (clientes e corretores)' },
    { value: 'ADMIN', label: 'Painel do admin', dica: '/admin' }
];

function novo(): AvisoForm {
    return {
        nome: '',
        titulo: '',
        mensagem: '',
        tipo: 'MENSAGEM',
        posicao: 'bottom',
        severidade: 'secondary',
        icone: 'pi-info-circle',
        dispensavel: true,
        modal: true,
        textoAceite: 'Entendi',
        acaoAceite: 'FECHAR',
        linkAceite: null,
        novaAba: false,
        textoLink: null,
        urlLink: null,
        publico: 'TODOS',
        areas: ['SITE'],
        ativo: false,
        ordem: 0,
        inicioEm: null,
        fimEm: null,
        novaVersao: false
    };
}

/** Avisos do site: cookies, comunicados, convites (ex.: ler o FAQ). Cada edição do conteúdo pede um novo aceite. */
@Component({
    selector: 'app-avisos-page',
    imports: [
        DatePipe,
        FormsModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        SelectButtonModule,
        ToggleSwitchModule,
        CheckboxModule,
        DatePickerModule,
        DialogModule,
        TableModule,
        TabelaResponsiva,
        TagModule,
        TooltipModule,
        PageHeader,
        EditorTexto,
        AvisoView
    ],
    template: `
        <app-page-header titulo="Avisos e cookies" subtitulo="Mensagens exibidas aos usuários até serem aceitas. Mudou o conteúdo? Todos veem de novo.">
            <p-button label="Novo aviso" icon="pi pi-plus" (onClick)="abrir(null)" />
        </app-page-header>

        <div class="card">
            <p-table appTabelaResponsiva [value]="lista()" [loading]="carregando()" dataKey="id">
                <ng-template #header>
                    <tr>
                        <th scope="col">Aviso</th>
                        <th scope="col">Exibição</th>
                        <th scope="col">Para quem</th>
                        <th scope="col">Versão</th>
                        <th scope="col">Ativo</th>
                        <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                </ng-template>
                <ng-template #body let-a>
                    <tr>
                        <td>
                            <div class="flex items-center gap-2">
                                @if (a.icone) {
                                    <i [class]="'pi ' + a.icone + ' text-muted-color'" aria-hidden="true"></i>
                                }
                                <span class="font-semibold">{{ a.nome }}</span>
                            </div>
                            @if (a.titulo) {
                                <div class="text-sm text-muted-color">{{ a.titulo }}</div>
                            }
                        </td>
                        <td>
                            <p-tag [value]="rotuloTipo(a.tipo)" [severity]="a.severidade === 'error' ? 'danger' : a.severidade" />
                            <div class="text-xs text-muted-color mt-1">{{ rotuloPosicao(a.tipo, a.posicao) }}{{ a.dispensavel ? '' : ' · obrigatório' }}</div>
                        </td>
                        <td>
                            <div class="text-sm">{{ rotuloPublico(a.publico) }}</div>
                            <div class="text-xs text-muted-color">{{ rotuloAreas(a.areas) }}</div>
                            @if (a.inicioEm || a.fimEm) {
                                <div class="text-xs text-muted-color">{{ a.inicioEm ? 'de ' + (a.inicioEm | date: 'dd/MM/yy HH:mm') : '' }} {{ a.fimEm ? 'até ' + (a.fimEm | date: 'dd/MM/yy HH:mm') : '' }}</div>
                            }
                        </td>
                        <td>
                            <div class="text-sm">v{{ a.versao }}</div>
                            <div class="text-xs text-muted-color" pTooltip="Usuários logados que aceitaram a versão atual (visitantes guardam no navegador)" tooltipPosition="top">{{ a.aceitesVersaoAtual }} aceite(s)</div>
                        </td>
                        <td>
                            <p-toggleswitch [ngModel]="a.ativo" (ngModelChange)="alternar(a, $event)" [ariaLabel]="(a.ativo ? 'Desativar ' : 'Ativar ') + a.nome" />
                        </td>
                        <td class="text-right whitespace-nowrap">
                            <p-button icon="pi pi-eye" [text]="true" [rounded]="true" (onClick)="previsualizar(a)" [ariaLabel]="'Pré-visualizar ' + a.nome" pTooltip="Pré-visualizar" tooltipPosition="top" />
                            <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" (onClick)="abrir(a)" [ariaLabel]="'Editar ' + a.nome" pTooltip="Editar" tooltipPosition="top" />
                            <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" (onClick)="excluir(a)" [ariaLabel]="'Excluir ' + a.nome" pTooltip="Excluir" tooltipPosition="top" />
                        </td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="6" class="text-center text-muted-color py-6">Nenhum aviso cadastrado.</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>

        <!-- editor -->
        <p-dialog [blockScroll]="true" [visible]="editando()" (visibleChange)="!$event && editando.set(false)" [modal]="true" [header]="id() ? 'Editar aviso' : 'Novo aviso'" [style]="{ width: '68rem' }" [breakpoints]="{ '1100px': '96vw' }" [draggable]="false">
            <div class="editor">
                <div class="flex flex-col gap-5 min-w-0">
                    <!-- conteúdo -->
                    <fieldset class="secao">
                        <legend>Conteúdo</legend>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="flex flex-col gap-2">
                                <label for="av-nome">Nome interno <span class="text-red-600" aria-hidden="true">*</span></label>
                                <input pInputText id="av-nome" [(ngModel)]="f.nome" maxlength="80" placeholder="Ex.: Cookies, Convite FAQ" aria-required="true" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="av-titulo">Título</label>
                                <input pInputText id="av-titulo" [(ngModel)]="f.titulo" maxlength="120" />
                            </div>
                        </div>
                        <span class="block mt-4 mb-2">Mensagem <span class="text-red-600" aria-hidden="true">*</span></span>
                        <app-editor-texto [(valor)]="f.mensagem" rotulo="Mensagem do aviso" altura="7rem" [max]="5000" placeholder="O que o usuário precisa saber. Pode ter links." />
                    </fieldset>

                    <!-- aparência -->
                    <fieldset class="secao">
                        <legend>Como aparece</legend>
                        <span class="block mb-2" id="av-tipo-rot">Tipo</span>
                        <p-selectbutton [options]="tipos" [(ngModel)]="f.tipo" (ngModelChange)="aoMudarTipo()" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="av-tipo-rot">
                            <ng-template #item let-t>
                                <i [class]="t.icone" aria-hidden="true"></i>
                                <span class="ml-2">{{ t.label }}</span>
                            </ng-template>
                        </p-selectbutton>
                        <p class="text-xs text-muted-color mt-2 mb-0">{{ dicaTipo() }}</p>

                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
                            <div class="flex flex-col gap-2">
                                <label for="av-pos">Posição</label>
                                <p-select inputId="av-pos" [options]="posicoes()" [(ngModel)]="f.posicao" optionLabel="label" optionValue="value" appendTo="body" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="av-cor">Cor</label>
                                <p-select inputId="av-cor" [options]="severidades" [(ngModel)]="f.severidade" optionLabel="label" optionValue="value" appendTo="body">
                                    <ng-template #selectedItem let-s>
                                        <span class="flex items-center gap-2"><span [class]="'bolinha bolinha--' + s.value" aria-hidden="true"></span>{{ s.label }}</span>
                                    </ng-template>
                                    <ng-template #item let-s>
                                        <span class="flex items-center gap-2"><span [class]="'bolinha bolinha--' + s.value" aria-hidden="true"></span>{{ s.label }}</span>
                                    </ng-template>
                                </p-select>
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="av-icone">Ícone</label>
                                <p-select inputId="av-icone" [options]="icones" [(ngModel)]="f.icone" [showClear]="true" placeholder="Sem ícone" appendTo="body" [filter]="true" filterPlaceholder="Buscar">
                                    <ng-template #selectedItem let-i>
                                        <span class="flex items-center gap-2"><i [class]="'pi ' + i" aria-hidden="true"></i>{{ i.replace('pi-', '') }}</span>
                                    </ng-template>
                                    <ng-template #item let-i>
                                        <span class="flex items-center gap-2"><i [class]="'pi ' + i" aria-hidden="true"></i>{{ i.replace('pi-', '') }}</span>
                                    </ng-template>
                                </p-select>
                            </div>
                        </div>

                        <div class="flex flex-col gap-3 mt-4">
                            <label class="flex items-start gap-3 cursor-pointer">
                                <p-toggleswitch [(ngModel)]="f.dispensavel" inputId="av-disp" />
                                <span
                                    ><span class="block">Pode ser fechado sem aceitar</span
                                    ><small class="text-muted-color">{{ f.dispensavel ? 'Some só nesta sessão do navegador e volta na próxima, até ser aceito.' : 'Fica até o usuário clicar no botão principal.' }}</small></span
                                >
                            </label>
                            @if (f.tipo !== 'MENSAGEM') {
                                <label class="flex items-start gap-3 cursor-pointer">
                                    <p-toggleswitch [(ngModel)]="f.modal" inputId="av-modal" />
                                    <span
                                        ><span class="block">Bloquear a página (modal)</span
                                        ><small class="text-muted-color">Escurece o fundo e impede interagir com a página até fechar.</small></span
                                    >
                                </label>
                            }
                        </div>
                    </fieldset>

                    <!-- ações -->
                    <fieldset class="secao">
                        <legend>Botões</legend>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="flex flex-col gap-2">
                                <label for="av-aceite">Botão principal</label>
                                <input pInputText id="av-aceite" [(ngModel)]="f.textoAceite" maxlength="40" placeholder="Ex.: Aceitar, Entendi, Ler o FAQ (vazio: sem botão)" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="av-acao">Ao clicar</label>
                                <p-select inputId="av-acao" [options]="acoes" [(ngModel)]="f.acaoAceite" optionLabel="label" optionValue="value" [disabled]="!f.textoAceite" appendTo="body" />
                            </div>
                            @if (f.acaoAceite === 'LINK' && f.textoAceite) {
                                <div class="flex flex-col gap-2">
                                    <label for="av-link">Endereço</label>
                                    <input pInputText id="av-link" [(ngModel)]="f.linkAceite" maxlength="500" placeholder="/faq ou https://..." />
                                </div>
                                <label class="flex items-center gap-2 cursor-pointer sm:mt-8">
                                    <p-checkbox [(ngModel)]="f.novaAba" [binary]="true" inputId="av-aba" />
                                    Abrir em nova aba
                                </label>
                            }
                            <div class="flex flex-col gap-2">
                                <label for="av-tlink">Link secundário (opcional)</label>
                                <input pInputText id="av-tlink" [(ngModel)]="f.textoLink" maxlength="60" placeholder="Ex.: Política de privacidade" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="av-ulink">Endereço do link</label>
                                <input pInputText id="av-ulink" [(ngModel)]="f.urlLink" maxlength="500" placeholder="/privacidade ou https://..." />
                            </div>
                        </div>
                        @if (!f.textoAceite && !f.dispensavel) {
                            <p class="text-sm text-red-700 mt-3 mb-0" role="alert"><i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>Sem botão principal, o aviso precisa poder ser fechado.</p>
                        }
                    </fieldset>

                    <!-- público -->
                    <fieldset class="secao">
                        <legend>Para quem e quando</legend>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="flex flex-col gap-2">
                                <label for="av-publico">Público</label>
                                <p-select inputId="av-publico" [options]="publicos" [(ngModel)]="f.publico" optionLabel="label" optionValue="value" appendTo="body" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="av-ordem">Ordem</label>
                                <p-inputnumber inputId="av-ordem" [(ngModel)]="f.ordem" [min]="0" [max]="100000" [useGrouping]="false" />
                                <small class="text-muted-color">Diálogos e drawers aparecem um por vez, nesta ordem.</small>
                            </div>
                        </div>
                        <span class="block mt-4 mb-2" id="av-areas-rot">Onde aparece</span>
                        <div class="flex flex-wrap gap-4" role="group" aria-labelledby="av-areas-rot">
                            @for (ar of areas; track ar.value) {
                                <label class="flex items-start gap-2 cursor-pointer">
                                    <p-checkbox [ngModel]="f.areas.includes(ar.value)" (ngModelChange)="alternarArea(ar.value, $event)" [binary]="true" [inputId]="'av-area-' + ar.value" />
                                    <span
                                        ><span class="block">{{ ar.label }}</span><small class="text-muted-color">{{ ar.dica }}</small></span
                                    >
                                </label>
                            }
                        </div>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                            <div class="flex flex-col gap-2">
                                <label for="av-inicio">Exibir a partir de (opcional)</label>
                                <p-datepicker inputId="av-inicio" [(ngModel)]="inicio" [showTime]="true" hourFormat="24" dateFormat="dd/mm/yy" [showClear]="true" appendTo="body" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="av-fim">Exibir até (opcional)</label>
                                <p-datepicker inputId="av-fim" [(ngModel)]="fim" [showTime]="true" hourFormat="24" dateFormat="dd/mm/yy" [showClear]="true" appendTo="body" />
                            </div>
                        </div>
                    </fieldset>
                </div>

                <!-- lateral: esquema e estado -->
                <aside class="editor__lado">
                    <div class="secao">
                        <span class="font-semibold block mb-2">Onde aparece na tela</span>
                        <div class="esquema" [class.esquema--modal]="f.tipo !== 'MENSAGEM' && f.modal" aria-hidden="true">
                            <span class="esquema__topo"></span>
                            <span [class]="'esquema__aviso esquema__aviso--' + f.tipo.toLowerCase() + ' pos--' + f.posicao + ' bolinha--' + f.severidade"></span>
                        </div>
                        <p class="text-xs text-muted-color mt-2 mb-3">{{ rotuloTipo(f.tipo) }} · {{ rotuloPosicao(f.tipo, f.posicao) }}</p>
                        <p-button label="Ver como o usuário vê" icon="pi pi-eye" [outlined]="true" styleClass="w-full" (onClick)="previsualizarRascunho()" [disabled]="vazio(f.mensagem)" />
                    </div>

                    <div class="secao">
                        <label class="flex items-center gap-3 cursor-pointer">
                            <p-toggleswitch [(ngModel)]="f.ativo" inputId="av-ativo" />
                            <span class="font-semibold">Ativo</span>
                        </label>
                        @if (id()) {
                            <div class="text-sm text-muted-color mt-3">Versão atual: v{{ versaoAtual() }}</div>
                            <label class="flex items-start gap-2 cursor-pointer mt-2">
                                <p-checkbox [(ngModel)]="f.novaVersao" [binary]="true" inputId="av-nova" />
                                <span class="text-sm">Pedir confirmação de novo a todos, mesmo sem mudar o texto</span>
                            </label>
                            <p class="text-xs text-muted-color mt-2 mb-0">Mudar título, mensagem, botões ou links já cria uma nova versão automaticamente.</p>
                        }
                    </div>
                </aside>
            </div>

            <ng-template #footer>
                <p-button label="Cancelar" [text]="true" severity="secondary" (onClick)="editando.set(false)" />
                <p-button label="Salvar" icon="pi pi-check" [loading]="salvando()" [disabled]="!podeSalvar()" (onClick)="salvar()" />
            </ng-template>
        </p-dialog>

        <!-- pré-visualização: o mesmo componente que o site usa -->
        @if (previa(); as p) {
            @if (p.tipo === 'MENSAGEM') {
                <div [class]="'previa-barra previa-barra--' + p.posicao">
                    <app-aviso-view [aviso]="p" (aceito)="fecharPrevia()" (dispensado)="fecharPrevia()" />
                    <div class="text-center mt-2"><p-button label="Fechar pré-visualização" size="small" severity="contrast" (onClick)="fecharPrevia()" /></div>
                </div>
            } @else {
                <app-aviso-view [aviso]="p" [visivel]="true" (aceito)="fecharPrevia()" (dispensado)="fecharPrevia()" />
            }
        }
    `,
    styles: `
        .editor {
            display: grid;
            gap: 1.5rem;
        }
        @media (min-width: 992px) {
            .editor {
                grid-template-columns: minmax(0, 1fr) 18rem;
            }
            .editor__lado {
                position: sticky;
                top: 0;
                align-self: start;
            }
        }
        .editor__lado {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .secao {
            border: 1px solid var(--p-content-border-color);
            border-radius: 12px;
            padding: 1rem 1.1rem 1.1rem;
            margin: 0;
            min-width: 0;
        }
        legend {
            font-weight: 600;
            padding: 0 0.4rem;
        }
        .bolinha {
            display: inline-block;
            width: 0.8rem;
            height: 0.8rem;
            border-radius: 50%;
        }
        .bolinha--info {
            background: var(--p-blue-500);
        }
        .bolinha--success {
            background: var(--p-green-500);
        }
        .bolinha--warn {
            background: var(--p-amber-500);
        }
        .bolinha--error {
            background: var(--p-red-500);
        }
        .bolinha--secondary {
            background: var(--p-surface-400);
        }
        .bolinha--contrast {
            background: var(--p-surface-900);
        }
        /* miniatura da tela com o aviso na posição escolhida */
        .esquema {
            position: relative;
            aspect-ratio: 16 / 10;
            border-radius: 8px;
            border: 1px solid var(--p-content-border-color);
            background: var(--p-surface-50);
            overflow: hidden;
        }
        /* dentro do diálogo (no <body>): o tema escuro é lido do <html> */
        ::ng-deep .app-dark .esquema {
            background: var(--p-surface-800);
        }
        .esquema--modal::after {
            content: '';
            position: absolute;
            inset: 0;
            background: rgba(15, 23, 42, 0.35);
        }
        .esquema__topo {
            position: absolute;
            inset: 0 0 auto;
            height: 12%;
            background: var(--p-surface-200);
        }
        ::ng-deep .app-dark .esquema__topo {
            background: var(--p-surface-700);
        }
        .esquema__aviso {
            position: absolute;
            z-index: 1;
            border-radius: 4px;
            opacity: 0.9;
        }
        .esquema__aviso--mensagem {
            left: 4%;
            right: 4%;
            height: 14%;
        }
        .esquema__aviso--mensagem.pos--top {
            top: 3%;
        }
        .esquema__aviso--mensagem.pos--bottom {
            bottom: 4%;
        }
        .esquema__aviso--dialog {
            width: 42%;
            height: 38%;
        }
        .esquema__aviso--dialog.pos--center {
            left: 29%;
            top: 31%;
        }
        .esquema__aviso--dialog.pos--top {
            left: 29%;
            top: 4%;
        }
        .esquema__aviso--dialog.pos--bottom {
            left: 29%;
            bottom: 4%;
        }
        .esquema__aviso--dialog.pos--left {
            left: 3%;
            top: 31%;
        }
        .esquema__aviso--dialog.pos--right {
            right: 3%;
            top: 31%;
        }
        .esquema__aviso--dialog.pos--topleft {
            left: 3%;
            top: 4%;
        }
        .esquema__aviso--dialog.pos--topright {
            right: 3%;
            top: 4%;
        }
        .esquema__aviso--dialog.pos--bottomleft {
            left: 3%;
            bottom: 4%;
        }
        .esquema__aviso--dialog.pos--bottomright {
            right: 3%;
            bottom: 4%;
        }
        .esquema__aviso--drawer.pos--left {
            left: 0;
            top: 0;
            bottom: 0;
            width: 32%;
        }
        .esquema__aviso--drawer.pos--right {
            right: 0;
            top: 0;
            bottom: 0;
            width: 32%;
        }
        .esquema__aviso--drawer.pos--top {
            left: 0;
            right: 0;
            top: 0;
            height: 35%;
        }
        .esquema__aviso--drawer.pos--bottom {
            left: 0;
            right: 0;
            bottom: 0;
            height: 35%;
        }
        .esquema__aviso--drawer.pos--full {
            inset: 0;
        }
        .previa-barra {
            position: fixed;
            left: 0;
            right: 0;
            z-index: 1200;
            padding: 0.75rem;
        }
        .previa-barra > app-aviso-view {
            display: block;
            max-width: 72rem;
            margin: 0 auto;
        }
        .previa-barra--top {
            top: 0;
        }
        .previa-barra--bottom {
            bottom: 0;
        }
    `
})
export class AvisosPage {
    private servico = inject(AvisosService);
    private msg = inject(MessageService);
    private confirm = inject(ConfirmationService);

    readonly tipos = TIPOS_AVISO;
    readonly severidades = SEVERIDADES_AVISO;
    readonly icones = ICONES;
    readonly publicos = PUBLICOS;
    readonly areas = AREAS;
    readonly acoes = [
        { value: 'FECHAR', label: 'Registrar o aceite e fechar' },
        { value: 'LINK', label: 'Registrar o aceite e abrir um endereço' }
    ];
    vazio = htmlVazio;

    lista = signal<Aviso[]>([]);
    carregando = signal(true);
    editando = signal(false);
    salvando = signal(false);
    id = signal<number | null>(null);
    versaoAtual = signal(1);
    previa = signal<AvisoPublico | null>(null);

    /** Rascunho do editor (ngModel). */
    f: AvisoForm = novo();
    inicio: Date | null = null;
    fim: Date | null = null;
    /** Força o recálculo das listas que dependem do tipo. */
    private tipoAtual = signal<TipoAviso>('MENSAGEM');
    posicoes = computed(() => POSICOES_AVISO[this.tipoAtual()]);
    dicaTipo = computed(() => TIPOS_AVISO.find((t) => t.value === this.tipoAtual())?.dica ?? '');

    constructor() {
        inject(ConfigService).definirTitulo('Avisos e cookies');
        this.carregar();
    }

    carregar() {
        this.carregando.set(true);
        this.servico.listar().subscribe({
            next: (l) => {
                this.lista.set(l);
                this.carregando.set(false);
            },
            error: (e) => {
                this.carregando.set(false);
                this.msg.add({ severity: 'error', summary: 'Avisos', detail: mensagemErro(e) });
            }
        });
    }

    abrir(a: Aviso | null) {
        this.id.set(a?.id ?? null);
        this.versaoAtual.set(a?.versao ?? 1);
        this.f = a ? this.paraForm(a) : novo();
        this.inicio = a?.inicioEm ? new Date(a.inicioEm) : null;
        this.fim = a?.fimEm ? new Date(a.fimEm) : null;
        this.tipoAtual.set(this.f.tipo);
        this.editando.set(true);
    }

    aoMudarTipo() {
        this.tipoAtual.set(this.f.tipo);
        const validas = POSICOES_AVISO[this.f.tipo].map((p) => p.value);
        if (!validas.includes(this.f.posicao)) {
            this.f.posicao = this.f.tipo === 'MENSAGEM' ? 'bottom' : this.f.tipo === 'DRAWER' ? 'right' : 'center';
        }
    }

    alternarArea(area: AreaAviso, marcado: boolean) {
        this.f.areas = marcado ? [...new Set([...this.f.areas, area])] : this.f.areas.filter((x) => x !== area);
    }

    podeSalvar() {
        return !!this.f.nome.trim() && !htmlVazio(this.f.mensagem) && this.f.areas.length > 0 && (this.f.dispensavel || !!this.f.textoAceite?.trim());
    }

    salvar() {
        const form: AvisoForm = { ...this.f, inicioEm: this.inicio?.toISOString() ?? null, fimEm: this.fim?.toISOString() ?? null };
        this.salvando.set(true);
        this.servico.salvar(this.id(), form).subscribe({
            next: (a) => {
                this.salvando.set(false);
                this.editando.set(false);
                const novaVersao = this.id() !== null && a.versao > this.versaoAtual();
                this.msg.add({ severity: 'success', summary: 'Aviso salvo', detail: novaVersao ? `Nova versão (v${a.versao}): os usuários vão ver o aviso de novo.` : undefined });
                this.carregar();
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }

    alternar(a: Aviso, ativo: boolean) {
        const form: AvisoForm = { ...this.paraForm(a), ativo };
        this.servico.salvar(a.id, form).subscribe({
            next: () => {
                this.msg.add({ severity: 'success', summary: ativo ? 'Aviso ativado' : 'Aviso desativado', detail: a.nome });
                this.carregar();
            },
            error: (e) => {
                this.msg.add({ severity: 'error', summary: 'Não foi possível alterar', detail: mensagemErro(e) });
                this.carregar();
            }
        });
    }

    excluir(a: Aviso) {
        this.confirm.confirm({
            header: 'Excluir aviso',
            message: `Excluir "${a.nome}"? Os registros de aceite dele também são apagados.`,
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: { label: 'Cancelar', severity: 'secondary', text: true },
            acceptButtonProps: { label: 'Excluir', severity: 'danger' },
            accept: () =>
                this.servico.excluir(a.id).subscribe({
                    next: () => {
                        this.msg.add({ severity: 'success', summary: 'Aviso excluído' });
                        this.carregar();
                    },
                    error: (e) => this.msg.add({ severity: 'error', summary: 'Não foi possível excluir', detail: mensagemErro(e) })
                })
        });
    }

    previsualizar(a: Aviso) {
        this.previa.set({ ...a, versaoAceita: null });
    }

    previsualizarRascunho() {
        const f = this.f;
        this.previa.set({
            id: -1,
            versao: 1,
            titulo: f.titulo || null,
            mensagem: f.mensagem,
            tipo: f.tipo,
            posicao: f.posicao,
            severidade: f.severidade,
            icone: f.icone,
            dispensavel: f.dispensavel,
            modal: f.modal,
            textoAceite: f.textoAceite || null,
            acaoAceite: f.acaoAceite,
            linkAceite: f.linkAceite,
            novaAba: f.novaAba,
            textoLink: f.textoLink || null,
            urlLink: f.urlLink || null,
            ordem: f.ordem,
            versaoAceita: null
        });
    }

    fecharPrevia() {
        this.previa.set(null);
    }

    rotuloTipo(t: TipoAviso) {
        return TIPOS_AVISO.find((x) => x.value === t)?.label ?? t;
    }

    rotuloPosicao(t: TipoAviso, p: string) {
        return POSICOES_AVISO[t].find((x) => x.value === p)?.label ?? p;
    }

    rotuloPublico(p: PublicoAviso) {
        return PUBLICOS.find((x) => x.value === p)?.label ?? p;
    }

    rotuloAreas(a: AreaAviso[]) {
        return AREAS.filter((x) => a.includes(x.value))
            .map((x) => x.label)
            .join(', ');
    }

    private paraForm(a: Aviso): AvisoForm {
        return {
            nome: a.nome,
            titulo: a.titulo ?? '',
            mensagem: a.mensagem,
            tipo: a.tipo,
            posicao: a.posicao,
            severidade: a.severidade,
            icone: a.icone,
            dispensavel: a.dispensavel,
            modal: a.modal,
            textoAceite: a.textoAceite ?? '',
            acaoAceite: a.acaoAceite,
            linkAceite: a.linkAceite,
            novaAba: a.novaAba,
            textoLink: a.textoLink ?? '',
            urlLink: a.urlLink ?? '',
            publico: a.publico,
            areas: [...a.areas],
            ativo: a.ativo,
            ordem: a.ordem,
            inicioEm: a.inicioEm,
            fimEm: a.fimEm,
            novaVersao: false
        };
    }
}
