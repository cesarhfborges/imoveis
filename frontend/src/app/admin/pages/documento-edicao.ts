import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageService } from 'primeng/api';
import { DocumentoAdmin, DocumentoForm, PERFIS_ACEITE, PerfilAceite, TIPOS_DOCUMENTO, TipoDocumento, VersaoDocumento, VersaoDocumentoDetalhe } from '@/app/core/models/models';
import { DocumentoService } from '@/app/core/services/documento.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { EditorDocumento } from '@/app/shared/components/editor-documento';
import { DocumentoConteudo } from '@/app/shared/components/documento-conteudo';
import { textoDoHtml } from '@/app/shared/components/editor-texto';

function slugDe(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
}

/** Cadastro/edição de um documento do site (Configurações › Documentos). */
@Component({
    selector: 'app-documento-edicao-page',
    imports: [
        DatePipe,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        TextareaModule,
        SelectModule,
        ToggleSwitchModule,
        RadioButtonModule,
        MessageModule,
        DialogModule,
        TagModule,
        InputGroupModule,
        InputGroupAddonModule,
        EditorDocumento,
        DocumentoConteudo
    ],
    template: `
        <nav aria-label="Caminho" class="text-sm text-muted-color mb-3 flex items-center gap-2">
            <a routerLink="/admin/configuracoes" [queryParams]="{ aba: 'documentos' }" class="hover:text-primary hover:underline">Configurações › Documentos</a>
            <i class="pi pi-angle-right text-xs" aria-hidden="true"></i>
            <span aria-current="page">{{ atual() ? 'Editar' : 'Novo documento' }}</span>
        </nav>

        <header class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
            <div class="min-w-0">
                <h1 class="text-2xl font-semibold m-0 truncate">{{ valores().titulo || 'Novo documento' }}</h1>
                @if (atual(); as a) {
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-color">
                        @if (a.excluidoEm) {
                            <p-tag value="Excluído" severity="danger" />
                        } @else {
                            <p-tag [value]="a.ativo ? 'Ativo' : 'Inativo'" [severity]="a.ativo ? 'success' : 'secondary'" />
                        }
                        <span>Versão {{ a.versao }} de {{ a.versaoEm | date: 'dd/MM/yyyy' }}</span>
                        @if (a.aceiteCadastro || a.aceiteContas) {
                            <span>{{ a.aceitesVersaoAtual }} aceite(s) da versão atual · {{ a.aceitesTotal }} no total</span>
                        }
                    </div>
                }
            </div>
            <div class="flex flex-wrap gap-2 shrink-0">
                <p-button label="Pré-visualizar" icon="pi pi-eye" severity="secondary" [outlined]="true" (onClick)="previa.set(true)" />
                @if (atual()?.ativo) {
                    <a [href]="'/documentos/' + atual()!.slug" target="_blank" rel="noopener" class="p-button p-button-outlined gap-2"><i class="pi pi-external-link" aria-hidden="true"></i> Ver no site</a>
                }
            </div>
        </header>

        <form [formGroup]="form" (ngSubmit)="salvar()" novalidate>
            <div class="grid grid-cols-12 gap-6 items-start">
                <div class="col-span-12 xl:col-span-8 flex flex-col gap-6 min-w-0">
                    <section class="card m-0 flex flex-col gap-4" aria-labelledby="doc-id-titulo">
                        <h2 id="doc-id-titulo" class="text-lg font-semibold m-0">Identificação</h2>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div class="flex flex-col gap-2 min-w-0">
                                <label for="doc-tipo" class="font-medium">Tipo *</label>
                                <p-select inputId="doc-tipo" formControlName="tipo" [options]="tipos" optionLabel="label" optionValue="value" [fluid]="true" (onChange)="sugerirPorTipo($event.value)">
                                    <ng-template #item let-t>
                                        <span class="inline-flex items-center gap-2"><i class="pi {{ t.icone }}" aria-hidden="true"></i>{{ t.label }}</span>
                                    </ng-template>
                                </p-select>
                            </div>
                            <div class="flex flex-col gap-2 min-w-0">
                                <label for="doc-titulo" class="font-medium">Título *</label>
                                <input pInputText id="doc-titulo" formControlName="titulo" maxlength="120" class="w-full" (input)="tituloMudou()" [attr.aria-invalid]="invalido('titulo')" />
                            </div>
                            <div class="flex flex-col gap-2 min-w-0 md:col-span-2">
                                <label for="doc-slug" class="font-medium">Endereço no site *</label>
                                <p-inputgroup>
                                    <p-inputgroup-addon>{{ origem }}/documentos/</p-inputgroup-addon>
                                    <input pInputText id="doc-slug" formControlName="slug" maxlength="80" (input)="slugEditado = true" [attr.aria-invalid]="invalido('slug')" aria-describedby="doc-slug-dica" />
                                </p-inputgroup>
                                <small id="doc-slug-dica" [class]="invalido('slug') ? 'text-red-600 dark:text-red-400' : 'text-muted-color'">Letras minúsculas, números e hífens. Mudar o endereço quebra links já compartilhados.</small>
                            </div>
                            <div class="flex flex-col gap-2 min-w-0 md:col-span-2">
                                <label for="doc-resumo" class="font-medium">Resumo</label>
                                <textarea pTextarea id="doc-resumo" formControlName="resumo" rows="2" maxlength="300" [autoResize]="true" placeholder="Uma frase sobre o documento (aparece na central e no aviso de aceite)"></textarea>
                            </div>
                        </div>
                    </section>

                    <section class="card m-0 flex flex-col gap-3" aria-labelledby="doc-conteudo-titulo">
                        <h2 id="doc-conteudo-titulo" class="text-lg font-semibold m-0">Conteúdo</h2>
                        <app-editor-documento [valor]="conteudo()" (valorChange)="conteudo.set($event)" (editado)="conteudoMudou.set(true)" />
                    </section>
                </div>

                <aside class="col-span-12 xl:col-span-4 flex flex-col gap-6 xl:sticky xl:top-24" aria-label="Publicação e aceite">
                    <section class="card m-0 flex flex-col gap-4" aria-labelledby="doc-pub-titulo">
                        <h2 id="doc-pub-titulo" class="text-lg font-semibold m-0">Publicação</h2>
                        <label for="doc-ativo" class="flex items-start justify-between gap-3 cursor-pointer">
                            <span>
                                <span class="block font-medium">Ativo</span>
                                <span class="block text-xs text-muted-color">{{ valores().ativo ? 'Aparece no site e vale para os aceites.' : 'Fora do site e sem exigir aceite.' }}</span>
                            </span>
                            <p-toggleswitch inputId="doc-ativo" formControlName="ativo" />
                        </label>
                        <label for="doc-publico" class="flex items-start justify-between gap-3 cursor-pointer">
                            <span>
                                <span class="block font-medium">Na central de documentos</span>
                                <span class="block text-xs text-muted-color">Listado na central /documentos. Desligado, só abre pelo endereço direto.</span>
                            </span>
                            <p-toggleswitch inputId="doc-publico" formControlName="publico" />
                        </label>
                        <div class="flex flex-col gap-2">
                            <label for="doc-ordem" class="font-medium">Ordem</label>
                            <p-inputnumber inputId="doc-ordem" formControlName="ordem" [min]="0" [max]="999" [showButtons]="true" [fluid]="true" />
                        </div>
                    </section>

                    <section class="card m-0 flex flex-col gap-4" aria-labelledby="doc-aceite-titulo">
                        <h2 id="doc-aceite-titulo" class="text-lg font-semibold m-0">Aceite obrigatório</h2>
                        <label for="doc-aceite-cad" class="flex items-start justify-between gap-3 cursor-pointer">
                            <span>
                                <span class="block font-medium">Exigir no cadastro</span>
                                <span class="block text-xs text-muted-color">Caixa "Li e aceito" obrigatória para criar a conta.</span>
                            </span>
                            <p-toggleswitch inputId="doc-aceite-cad" formControlName="aceiteCadastro" />
                        </label>
                        <label for="doc-aceite-contas" class="flex items-start justify-between gap-3 cursor-pointer">
                            <span>
                                <span class="block font-medium">Exigir de quem já tem conta</span>
                                <span class="block text-xs text-muted-color">Ao entrar, a pessoa só continua depois de aceitar a versão atual.</span>
                            </span>
                            <p-toggleswitch inputId="doc-aceite-contas" formControlName="aceiteContas" />
                        </label>
                        @if (valores().aceiteCadastro || valores().aceiteContas) {
                            <div class="flex flex-col gap-2">
                                <label for="doc-perfil" class="font-medium">Vale para</label>
                                <p-select inputId="doc-perfil" formControlName="aceitePerfil" [options]="perfis" optionLabel="label" optionValue="value" [fluid]="true" />
                                <small class="text-muted-color">Administradores não precisam aceitar.</small>
                            </div>
                        }
                    </section>

                    @if (atual() && textoMudou()) {
                        <section class="card m-0 flex flex-col gap-3 border-2! border-primary!" aria-labelledby="doc-versao-titulo">
                            <h2 id="doc-versao-titulo" class="text-lg font-semibold m-0">Como salvar a mudança no texto?</h2>
                            <label for="doc-v-correcao" class="flex items-start gap-3 p-3 rounded-border border cursor-pointer" [class]="!valores().novaVersao ? 'border-primary bg-primary-50 dark:bg-primary-400/10' : 'border-surface'">
                                <p-radiobutton inputId="doc-v-correcao" name="doc-versao" formControlName="novaVersao" [value]="false" />
                                <span>
                                    <span class="block font-medium">Correção da versão {{ atual()!.versao }}</span>
                                    <span class="block text-xs text-muted-color">Ajustes de digitação ou formatação. Quem já aceitou não precisa aceitar de novo.</span>
                                </span>
                            </label>
                            <label for="doc-v-nova" class="flex items-start gap-3 p-3 rounded-border border cursor-pointer" [class]="valores().novaVersao ? 'border-primary bg-primary-50 dark:bg-primary-400/10' : 'border-surface'">
                                <p-radiobutton inputId="doc-v-nova" name="doc-versao" formControlName="novaVersao" [value]="true" />
                                <span>
                                    <span class="block font-medium">Nova versão ({{ atual()!.versao + 1 }})</span>
                                    <span class="block text-xs text-muted-color">Mudança de regras. A versão anterior fica no histórico e{{ valores().aceiteContas ? ' todos precisarão aceitar de novo' : ' os próximos aceites serão desta versão' }}.</span>
                                </span>
                            </label>
                            <div class="flex flex-col gap-2">
                                <label for="doc-nota" class="font-medium">Nota da alteração</label>
                                <input pInputText id="doc-nota" formControlName="notaVersao" maxlength="300" placeholder="Ex.: inclusão da seção sobre cookies" class="w-full" />
                            </div>
                        </section>
                    }

                    @if (versoes().length) {
                        <section class="card m-0 flex flex-col gap-2" aria-labelledby="doc-hist-titulo">
                            <h2 id="doc-hist-titulo" class="text-lg font-semibold mt-0 mb-1">Histórico de versões</h2>
                            @for (v of versoes(); track v.versao) {
                                <button type="button" class="flex items-center justify-between gap-3 text-left p-2 rounded-border hover:bg-emphasis cursor-pointer bg-transparent border-0 text-color" (click)="abrirVersao(v)">
                                    <span class="min-w-0">
                                        <span class="block font-medium">Versão {{ v.versao }}{{ v.versao === atual()?.versao ? ' (atual)' : '' }}</span>
                                        <span class="block text-xs text-muted-color truncate">{{ v.publicadoEm | date: 'dd/MM/yyyy HH:mm' }}{{ v.nota ? ' · ' + v.nota : '' }}</span>
                                    </span>
                                    <span class="text-xs text-muted-color shrink-0">{{ v.aceites }} aceite(s)</span>
                                </button>
                            }
                        </section>
                    }
                </aside>
            </div>

            <div class="sticky bottom-0 z-20 mt-6 -mx-2 px-2 py-3 bg-surface-50/95 dark:bg-surface-950/95 backdrop-blur border-t border-surface">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <span class="text-sm" role="status" aria-live="polite">
                        @if (sujo()) {
                            <span class="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400"><i class="pi pi-circle-fill text-[0.5rem]" aria-hidden="true"></i> Alterações não salvas</span>
                        } @else if (atual()) {
                            <span class="inline-flex items-center gap-2 text-muted-color"><i class="pi pi-check text-xs" aria-hidden="true"></i> Tudo salvo</span>
                        }
                    </span>
                    <div class="flex gap-2">
                        <a routerLink="/admin/configuracoes" [queryParams]="{ aba: 'documentos' }" class="p-button p-button-text p-button-secondary">Voltar</a>
                        <p-button type="submit" [label]="atual() ? 'Salvar' : 'Criar documento'" icon="pi pi-check" [loading]="salvando()" />
                    </div>
                </div>
            </div>
        </form>

        <p-dialog [visible]="previa()" (visibleChange)="previa.set($event)" [modal]="true" [dismissableMask]="true" [header]="'Pré-visualização: ' + (valores().titulo || 'documento')" [style]="{ width: '60rem' }" [breakpoints]="{ '960px': '96vw' }">
            <app-documento-conteudo [html]="conteudo()" />
        </p-dialog>

        <p-dialog [visible]="!!versaoAberta()" (visibleChange)="!$event && versaoAberta.set(null)" [modal]="true" [dismissableMask]="true" [header]="versaoAberta() ? 'Versão ' + versaoAberta()!.versao + ' · ' + versaoAberta()!.titulo : ''" [style]="{ width: '60rem' }" [breakpoints]="{ '960px': '96vw' }">
            @if (versaoAberta(); as v) {
                <p class="text-sm text-muted-color mt-0">Publicada em {{ v.publicadoEm | date: "dd/MM/yyyy 'às' HH:mm" }}{{ v.nota ? ' · ' + v.nota : '' }}</p>
                <app-documento-conteudo [html]="v.conteudo" />
            }
        </p-dialog>
    `
})
export class DocumentoEdicaoPage {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private documentos = inject(DocumentoService);
    private msg = inject(MessageService);
    private fb = inject(NonNullableFormBuilder);

    readonly tipos = TIPOS_DOCUMENTO;
    readonly perfis = PERFIS_ACEITE;
    readonly origem = location.host;

    atual = signal<DocumentoAdmin | null>(null);
    versoes = signal<VersaoDocumento[]>([]);
    versaoAberta = signal<VersaoDocumentoDetalhe | null>(null);
    conteudo = signal('');
    conteudoMudou = signal(false);
    salvando = signal(false);
    previa = signal(false);
    private tentou = signal(false);
    slugEditado = false;

    form = this.fb.group({
        tipo: this.fb.control<TipoDocumento>('TERMOS_USO'),
        titulo: ['', [Validators.required, Validators.maxLength(120)]],
        slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)]],
        resumo: [''],
        ativo: [false],
        publico: [true],
        aceiteCadastro: [false],
        aceiteContas: [false],
        aceitePerfil: this.fb.control<PerfilAceite>('TODOS'),
        ordem: this.fb.control<number>(0),
        novaVersao: [false],
        notaVersao: ['']
    });
    valores = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), { initialValue: this.form.getRawValue() });
    private formSujo = toSignal(this.form.events.pipe(map(() => this.form.dirty)), { initialValue: false });
    sujo = computed(() => this.formSujo() || this.conteudoMudou());
    /** O título ou o texto mudou em relação ao salvo (só então faz sentido escolher correção x nova versão). */
    textoMudou = computed(() => {
        const a = this.atual();
        return !!a && (this.conteudoMudou() || this.valores().titulo.trim() !== a.titulo);
    });

    constructor() {
        inject(ConfigService).definirTitulo('Documento');
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.documentos.obterAdmin(Number(id)).subscribe({
                next: (d) => this.carregar(d),
                error: (e) => {
                    this.msg.add({ severity: 'error', summary: 'Documento', detail: mensagemErro(e) });
                    this.router.navigate(['/admin/configuracoes'], { queryParams: { aba: 'documentos' } });
                }
            });
        } else {
            this.sugerirPorTipo('TERMOS_USO');
        }
    }

    private carregar(d: DocumentoAdmin) {
        this.atual.set(d);
        this.slugEditado = true;
        this.form.reset({ tipo: d.tipo, titulo: d.titulo, slug: d.slug, resumo: d.resumo ?? '', ativo: d.ativo, publico: d.publico, aceiteCadastro: d.aceiteCadastro, aceiteContas: d.aceiteContas, aceitePerfil: d.aceitePerfil, ordem: d.ordem, novaVersao: false, notaVersao: '' });
        // conteúdo antigo colado com &nbsp; (espaço que não quebra linha): normaliza ao abrir no editor
        this.conteudo.set(d.conteudo.replace(/&nbsp;|\u00A0/g, ' '));
        this.conteudoMudou.set(false);
        this.documentos.versoes(d.id).subscribe({ next: (v) => this.versoes.set(v), error: () => undefined });
    }

    invalido(campo: 'titulo' | 'slug') {
        const c = this.form.controls[campo];
        return c.invalid && (c.touched || this.tentou());
    }

    /** Em documento novo, o tipo sugere título e endereço (sem sobrescrever o que a pessoa já digitou). */
    sugerirPorTipo(tipo: TipoDocumento) {
        if (this.atual()) return;
        const t = TIPOS_DOCUMENTO.find((x) => x.value === tipo)!;
        if (!this.form.controls.titulo.value || !this.form.controls.titulo.dirty) this.form.controls.titulo.setValue(tipo === 'OUTRO' ? '' : t.label.replace(' (LGPD)', ''));
        if (!this.slugEditado) this.form.controls.slug.setValue(t.slug);
    }

    tituloMudou() {
        if (!this.slugEditado && !this.atual()) this.form.controls.slug.setValue(slugDe(this.form.controls.titulo.value));
    }

    abrirVersao(v: VersaoDocumento) {
        const a = this.atual();
        if (!a) return;
        this.documentos.versao(a.id, v.versao).subscribe({ next: (d) => this.versaoAberta.set(d), error: (e) => this.msg.add({ severity: 'error', summary: 'Versão', detail: mensagemErro(e) }) });
    }

    salvar() {
        this.tentou.set(true);
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Confira o formulário', detail: 'Informe o título e um endereço válido.' });
            return;
        }
        const v = this.form.getRawValue();
        if (v.ativo && !textoDoHtml(this.conteudo())) {
            this.msg.add({ severity: 'warn', summary: 'Documento vazio', detail: 'Escreva o conteúdo antes de ativar.' });
            return;
        }
        const dados: DocumentoForm = { ...v, resumo: v.resumo.trim() || null, notaVersao: v.notaVersao.trim() || null, conteudo: this.conteudo(), novaVersao: this.textoMudou() && v.novaVersao };
        const a = this.atual();
        this.salvando.set(true);
        (a ? this.documentos.atualizar(a.id, dados) : this.documentos.criar(dados)).subscribe({
            next: (d) => {
                this.salvando.set(false);
                this.documentos.carregarPublicos(true);
                this.msg.add({ severity: 'success', summary: a ? (dados.novaVersao ? `Versão ${d.versao} publicada` : 'Documento salvo') : 'Documento criado', detail: d.titulo });
                if (a) {
                    this.carregar(d);
                } else {
                    // segue para a edição do documento criado (não volta para a lista)
                    this.router.navigate(['/admin/documentos', d.id], { replaceUrl: true });
                }
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }
}
