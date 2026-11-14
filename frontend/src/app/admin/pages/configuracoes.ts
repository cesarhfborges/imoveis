import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { Configuracao } from '@/app/core/models/models';
import { ConfigService } from '@/app/core/services/config.service';
import { ThemeChoice, ThemeService, PresetName } from '@/app/core/services/theme.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { ImageUpload } from '@/app/shared/components/image-upload';
import { ThemePicker } from '@/app/shared/components/theme-picker';
import { AppLogo } from '@/app/shared/components/app-logo';

/** Configuração global do site: identidade (nome, logos, favicon), SEO, contato, tema e regras. */
@Component({
    selector: 'app-configuracoes-page',
    imports: [ReactiveFormsModule, InputTextModule, TextareaModule, ButtonModule, ToggleSwitchModule, TabsModule, PageHeader, ImageUpload, ThemePicker, AppLogo],
    template: `
        <app-page-header titulo="Configurações do site" subtitulo="O que for salvo aqui vale para todos os visitantes.">
            <p-button label="Salvar" icon="pi pi-check" (onClick)="salvar()" [loading]="salvando()" />
        </app-page-header>

        <form [formGroup]="form" (ngSubmit)="salvar()">
            <p-tabs value="identidade">
                <p-tablist>
                    <p-tab value="identidade">Identidade</p-tab>
                    <p-tab value="seo">SEO</p-tab>
                    <p-tab value="contato">Contato</p-tab>
                    <p-tab value="tema">Tema</p-tab>
                    <p-tab value="regras">Regras</p-tab>
                </p-tablist>
                <p-tabpanels>
                    <p-tabpanel value="identidade">
                        <div class="grid gap-4 md:grid-cols-2">
                            <div class="flex flex-col gap-2">
                                <label for="cf-nome">Nome do app *</label>
                                <input pInputText id="cf-nome" formControlName="nomeApp" maxlength="80" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="cf-slogan">Slogan</label>
                                <input pInputText id="cf-slogan" formControlName="slogan" maxlength="160" />
                            </div>
                            <app-image-upload rotulo="Logo (tema claro)" [url]="form.controls.logoUrl.value" (urlChange)="form.controls.logoUrl.setValue($event)" />
                            <app-image-upload rotulo="Logo (tema escuro)" [url]="form.controls.logoEscuroUrl.value" (urlChange)="form.controls.logoEscuroUrl.setValue($event)" />
                            <app-image-upload rotulo="Favicon (ícone da aba)" [url]="form.controls.faviconUrl.value" (urlChange)="form.controls.faviconUrl.setValue($event)" />
                            <div class="flex flex-col gap-2">
                                <span>Prévia atual</span>
                                <div class="p-3 border border-surface rounded-border"><app-logo /></div>
                            </div>
                        </div>
                    </p-tabpanel>
                    <p-tabpanel value="seo">
                        <div class="flex flex-col gap-4">
                            <div class="flex flex-col gap-2">
                                <label for="cf-st">Título para buscadores</label>
                                <input pInputText id="cf-st" formControlName="seoTitulo" maxlength="120" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="cf-sd">Descrição (aparece no Google e ao compartilhar)</label>
                                <textarea pTextarea id="cf-sd" formControlName="seoDescricao" rows="3" maxlength="300"></textarea>
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="cf-sk">Palavras-chave (separadas por vírgula)</label>
                                <input pInputText id="cf-sk" formControlName="seoPalavrasChave" maxlength="300" />
                            </div>
                            <app-image-upload rotulo="Imagem de compartilhamento (redes sociais)" [url]="form.controls.seoImagemUrl.value" (urlChange)="form.controls.seoImagemUrl.setValue($event)" />
                        </div>
                    </p-tabpanel>
                    <p-tabpanel value="contato">
                        <div class="grid gap-4 md:grid-cols-2">
                            @for (c of camposContato; track c.campo) {
                                <div class="flex flex-col gap-2" [class.md:col-span-2]="c.largo">
                                    <label [for]="'cf-' + c.campo">{{ c.label }}</label>
                                    <input pInputText [id]="'cf-' + c.campo" [formControlName]="c.campo" />
                                </div>
                            }
                            <div class="flex flex-col gap-2 md:col-span-2">
                                <label for="cf-rod">Texto do rodapé</label>
                                <textarea pTextarea id="cf-rod" formControlName="textoRodape" rows="2" maxlength="300"></textarea>
                            </div>
                        </div>
                    </p-tabpanel>
                    <p-tabpanel value="tema">
                        <div class="grid gap-6 md:grid-cols-2">
                            <div>
                                <p class="text-muted-color mt-0">Cor primária, surface, preset e modo (claro, escuro ou automático) padrão do site. A prévia aparece na hora; clique em Salvar para valer para todos.</p>
                                <app-theme-picker [value]="tema()" (valueChange)="mudarTema($event)" />
                            </div>
                            <div class="flex flex-col gap-3 p-4 border border-surface rounded-border">
                                <span class="font-semibold">Prévia</span>
                                <app-logo />
                                <div class="flex flex-wrap gap-2">
                                    <p-button label="Botão primário" size="small" />
                                    <p-button label="Secundário" severity="secondary" size="small" />
                                    <p-button label="Contorno" [outlined]="true" size="small" />
                                </div>
                                <input pInputText placeholder="Campo de texto" aria-label="Exemplo de campo de texto" />
                            </div>
                        </div>
                    </p-tabpanel>
                    <p-tabpanel value="regras">
                        <div class="flex flex-col gap-4">
                            <label class="flex items-center gap-3"><p-toggleswitch formControlName="moderarAnuncios" inputId="cf-mod" /> Anúncios novos de corretores precisam de aprovação de um administrador</label>
                            <label class="flex items-center gap-3"><p-toggleswitch formControlName="permitirCadastroCorretor" inputId="cf-cad" /> Permitir que corretores e imobiliárias se cadastrem pelo site</label>
                        </div>
                    </p-tabpanel>
                </p-tabpanels>
            </p-tabs>
        </form>
    `
})
export class ConfiguracoesPage {
    private config = inject(ConfigService);
    private theme = inject(ThemeService);
    private msg = inject(MessageService);
    private fb = inject(NonNullableFormBuilder);

    salvando = signal(false);
    tema = signal<ThemeChoice>({ preset: 'Aura', primary: 'marinho', surface: null, mode: 'auto' });

    camposContato = [
        { campo: 'emailContato', label: 'E-mail de contato', largo: false },
        { campo: 'telefoneContato', label: 'Telefone', largo: false },
        { campo: 'whatsapp', label: 'WhatsApp', largo: false },
        { campo: 'endereco', label: 'Endereço', largo: false },
        { campo: 'instagram', label: 'Instagram (URL)', largo: false },
        { campo: 'facebook', label: 'Facebook (URL)', largo: false }
    ];

    form = this.fb.group({
        nomeApp: ['', [Validators.required, Validators.maxLength(80)]],
        slogan: [''],
        logoUrl: this.fb.control<string | null>(null),
        logoEscuroUrl: this.fb.control<string | null>(null),
        faviconUrl: this.fb.control<string | null>(null),
        seoTitulo: [''],
        seoDescricao: [''],
        seoPalavrasChave: [''],
        seoImagemUrl: this.fb.control<string | null>(null),
        emailContato: [''],
        telefoneContato: [''],
        whatsapp: [''],
        endereco: [''],
        instagram: [''],
        facebook: [''],
        textoRodape: [''],
        moderarAnuncios: [false],
        permitirCadastroCorretor: [true]
    });

    constructor() {
        this.config.definirTitulo('Configurações');
        const c = this.config.config();
        this.preencher(c);
    }

    private preencher(c: Configuracao) {
        this.form.reset({
            nomeApp: c.nomeApp,
            slogan: c.slogan ?? '',
            logoUrl: c.logoUrl,
            logoEscuroUrl: c.logoEscuroUrl,
            faviconUrl: c.faviconUrl,
            seoTitulo: c.seoTitulo ?? '',
            seoDescricao: c.seoDescricao ?? '',
            seoPalavrasChave: c.seoPalavrasChave ?? '',
            seoImagemUrl: c.seoImagemUrl,
            emailContato: c.emailContato ?? '',
            telefoneContato: c.telefoneContato ?? '',
            whatsapp: c.whatsapp ?? '',
            endereco: c.endereco ?? '',
            instagram: c.instagram ?? '',
            facebook: c.facebook ?? '',
            textoRodape: c.textoRodape ?? '',
            moderarAnuncios: c.moderarAnuncios,
            permitirCadastroCorretor: c.permitirCadastroCorretor
        });
        this.tema.set({ preset: c.temaPreset as PresetName, primary: c.temaPrimaria, surface: c.temaSurface, mode: c.temaModo });
    }

    mudarTema(t: ThemeChoice) {
        this.tema.set(t);
        this.theme.apply(t, false);
    }

    salvar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Informe o nome do app' });
            return;
        }
        const v = this.form.getRawValue();
        const t = this.tema();
        const nulo = (s: string) => (s.trim() ? s.trim() : null);
        const dto: Configuracao = {
            ...v,
            nomeApp: v.nomeApp.trim(),
            slogan: nulo(v.slogan),
            seoTitulo: nulo(v.seoTitulo),
            seoDescricao: nulo(v.seoDescricao),
            seoPalavrasChave: nulo(v.seoPalavrasChave),
            emailContato: nulo(v.emailContato),
            telefoneContato: nulo(v.telefoneContato),
            whatsapp: nulo(v.whatsapp),
            endereco: nulo(v.endereco),
            instagram: nulo(v.instagram),
            facebook: nulo(v.facebook),
            textoRodape: nulo(v.textoRodape),
            temaPreset: t.preset,
            temaPrimaria: t.primary,
            temaSurface: t.surface,
            temaModo: t.mode
        };
        this.salvando.set(true);
        this.config.salvar(dto).subscribe({
            next: () => {
                this.salvando.set(false);
                this.theme.resetToSite();
                this.msg.add({ severity: 'success', summary: 'Configurações salvas', detail: 'Já valem para todos os visitantes.' });
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }
}
