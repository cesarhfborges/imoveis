import { ActivatedRoute } from '@angular/router';
import { DocumentosLista } from '@/app/admin/components/documentos-lista';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { asapScheduler, map, observeOn } from 'rxjs';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TabsModule } from 'primeng/tabs';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Configuracao, EXIBICOES_TELEFONE, ExibicaoTelefone } from '@/app/core/models/models';
import { ConfigService } from '@/app/core/services/config.service';
import { ThemeChoice, ThemeService, PresetName } from '@/app/core/services/theme.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { formatarTelefone } from '@/app/core/pipes/formatos';
import { PageHeader } from '@/app/shared/components/page-header';
import { ImageUpload } from '@/app/shared/components/image-upload';
import { RECORTES } from '@/app/shared/components/image-editor';
import { ThemePicker } from '@/app/shared/components/theme-picker';
import { AppLogo } from '@/app/shared/components/app-logo';
import { TelefoneInput } from '@/app/shared/components/telefone-input';

/** Configuração global do site: identidade (nome, logos, favicon), SEO, contato, tema e regras. */
@Component({
    selector: 'app-configuracoes-page',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        TextareaModule,
        ButtonModule,
        ToggleSwitchModule,
        TabsModule,
        RadioButtonModule,
        SelectModule,
        TagModule,
        MessageModule,
        AutoCompleteModule,
        TooltipModule,
        PageHeader,
        ImageUpload,
        ThemePicker,
        AppLogo,
        TelefoneInput,
        DocumentosLista
    ],
    template: `
        <app-page-header titulo="Configurações do site" subtitulo="O que for salvo aqui vale para todos os visitantes.">
            <p-button label="Salvar" icon="pi pi-check" (onClick)="salvar()" [loading]="salvando()" />
        </app-page-header>

        <form [formGroup]="form" (ngSubmit)="salvar()">
            <p-tabs [value]="abaInicial">
                <p-tablist>
                    <p-tab value="identidade">Identidade</p-tab>
                    <p-tab value="seo">SEO</p-tab>
                    <p-tab value="contato">Contato</p-tab>
                    <p-tab value="tema">Tema</p-tab>
                    <p-tab value="regras">Regras</p-tab>
                    <p-tab value="documentos">Documentos</p-tab>
                </p-tablist>
                <p-tabpanels>
                    <p-tabpanel value="identidade">
                        <div class="grid gap-8 lg:grid-cols-5">
                            <div class="lg:col-span-3 flex flex-col gap-6">
                                <!-- Nome e slogan -->
                                <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" aria-labelledby="id-nome">
                                    <div>
                                        <h3 id="id-nome" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-id-card text-primary" aria-hidden="true"></i> Nome e slogan</h3>
                                        <p class="text-sm text-muted-color mt-1 mb-0">Como o portal se apresenta em todo o site, nos e-mails e nas abas do navegador.</p>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex items-baseline justify-between gap-2">
                                            <label for="cf-nome" class="font-medium">Nome do app <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span></label>
                                            <small class="text-muted-color">{{ seo().nomeApp.length }}/80</small>
                                        </div>
                                        <input pInputText id="cf-nome" formControlName="nomeApp" maxlength="80" required [invalid]="nomeInvalido()" aria-describedby="cf-nome-dica" />
                                        @if (nomeInvalido()) {
                                            <small id="cf-nome-dica" class="text-red-600 dark:text-red-400" role="alert">Informe o nome do app.</small>
                                        } @else {
                                            <small id="cf-nome-dica" class="text-muted-color">Obrigatório. Aparece no topo do site quando não há logo.</small>
                                        }
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex items-baseline justify-between gap-2">
                                            <label for="cf-slogan" class="font-medium">Slogan</label>
                                            <small class="text-muted-color">{{ seo().slogan.length }}/160</small>
                                        </div>
                                        <input pInputText id="cf-slogan" formControlName="slogan" maxlength="160" aria-describedby="cf-slogan-dica" />
                                        <small id="cf-slogan-dica" class="text-muted-color">Frase curta, mostrada abaixo do nome quando não há logo.</small>
                                    </div>
                                </section>

                                <!-- Logos -->
                                <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" aria-labelledby="id-logos">
                                    <div>
                                        <h3 id="id-logos" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-image text-primary" aria-hidden="true"></i> Logos</h3>
                                        <p class="text-sm text-muted-color mt-1 mb-0">Sem logo, o site mostra o ícone com o nome e o slogan. Sem o logo escuro, o claro é usado também no tema escuro.</p>
                                    </div>
                                    <div class="grid gap-4 md:grid-cols-2">
                                        <app-image-upload
                                            rotulo="Para o tema claro"
                                            [vertical]="true"
                                            [recorte]="recortes.logo"
                                            dica="Fundo claro · 800×200 px (PNG)"
                                            [url]="form.controls.logoUrl.value"
                                            (urlChange)="form.controls.logoUrl.setValue($event)"
                                        />
                                        <app-image-upload
                                            rotulo="Para o tema escuro"
                                            [vertical]="true"
                                            [fundoEscuro]="true"
                                            [recorte]="recortes.logoEscuro"
                                            dica="Fundo escuro · 800×200 px (PNG)"
                                            [url]="form.controls.logoEscuroUrl.value"
                                            (urlChange)="form.controls.logoEscuroUrl.setValue($event)"
                                        />
                                    </div>
                                </section>

                                <!-- Favicon -->
                                <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" aria-labelledby="id-favicon">
                                    <div>
                                        <h3 id="id-favicon" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-bookmark text-primary" aria-hidden="true"></i> Favicon</h3>
                                        <p class="text-sm text-muted-color mt-1 mb-0">Ícone da aba do navegador, dos favoritos e do atalho no celular. Prefira um símbolo simples, sem texto.</p>
                                    </div>
                                    <app-image-upload
                                        rotulo="Ícone"
                                        formato="quadrado"
                                        [recorte]="recortes.favicon"
                                        dica="Você enquadra a imagem antes de enviar · salva em 256×256 px (PNG)"
                                        [url]="form.controls.faviconUrl.value"
                                        (urlChange)="form.controls.faviconUrl.setValue($event)"
                                    />
                                </section>
                            </div>

                            <!-- Prévia -->
                            <aside class="lg:col-span-2" aria-labelledby="id-previa">
                                <div class="lg:sticky lg:top-24 flex flex-col gap-4">
                                    <div class="flex items-center justify-between">
                                        <h3 id="id-previa" class="text-base font-semibold m-0">Prévia</h3>
                                        <span class="text-xs text-muted-color">Aparece na hora · vale para todos ao salvar</span>
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <span class="text-sm text-muted-color">Topo do site · tema claro</span>
                                        <div class="flex items-center justify-between gap-3 px-4 py-3 rounded-border border border-surface bg-white shadow-sm">
                                            <app-logo [nome]="seo().nomeApp" [slogan]="seo().slogan || null" [logoUrl]="seo().logoUrl" [logoEscuroUrl]="seo().logoEscuroUrl" [escuro]="false" />
                                            <i class="pi pi-bars text-surface-500" aria-hidden="true"></i>
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <span class="text-sm text-muted-color">Topo do site · tema escuro</span>
                                        <div class="app-dark flex items-center justify-between gap-3 px-4 py-3 rounded-border border border-surface-700 bg-surface-900 shadow-sm">
                                            <app-logo [nome]="seo().nomeApp" [slogan]="seo().slogan || null" [logoUrl]="seo().logoUrl" [logoEscuroUrl]="seo().logoEscuroUrl" [escuro]="true" />
                                            <i class="pi pi-bars text-surface-400" aria-hidden="true"></i>
                                        </div>
                                        @if (seo().logoUrl && !seo().logoEscuroUrl) {
                                            <small class="text-muted-color"><i class="pi pi-info-circle text-xs" aria-hidden="true"></i> Usando o logo claro: envie um logo escuro se ele não ficar legível aqui.</small>
                                        }
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <span class="text-sm text-muted-color">Aba do navegador</span>
                                        <div class="rounded-border border border-surface overflow-hidden bg-surface-200 dark:bg-surface-800" aria-hidden="true">
                                            <div class="flex items-end gap-1 px-2 pt-2">
                                                <div class="flex items-center gap-2 max-w-[16rem] px-3 py-2 rounded-t-lg bg-surface-0 dark:bg-surface-900 text-sm">
                                                    @if (seo().faviconUrl; as icone) {
                                                        <img [src]="icone" alt="" class="w-4 h-4 shrink-0" />
                                                    } @else {
                                                        <i class="pi pi-globe text-xs text-muted-color shrink-0"></i>
                                                    }
                                                    <span class="truncate">{{ tituloEfetivo() }}</span>
                                                    <i class="pi pi-times text-[0.6rem] text-muted-color shrink-0"></i>
                                                </div>
                                                <i class="pi pi-plus text-xs text-muted-color px-2 pb-2"></i>
                                            </div>
                                            <div class="flex items-center gap-2 px-3 py-2 bg-surface-0 dark:bg-surface-900 border-t border-surface">
                                                <i class="pi pi-lock text-xs text-muted-color"></i>
                                                <span class="text-xs text-muted-color truncate">{{ dominio }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </p-tabpanel>
                    <p-tabpanel value="seo">
                        <div class="grid gap-8 lg:grid-cols-5">
                            <div class="lg:col-span-3 flex flex-col gap-6">
                                <!-- Buscadores -->
                                <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" aria-labelledby="seo-busca">
                                    <div>
                                        <h3 id="seo-busca" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-search text-primary" aria-hidden="true"></i> Buscadores</h3>
                                        <p class="text-sm text-muted-color mt-1 mb-0">O que o Google mostra no resultado da busca da página inicial.</p>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex items-baseline justify-between gap-2">
                                            <label for="cf-st" class="font-medium">Título</label>
                                            <small [class]="tamTitulo().classe">{{ tamTitulo().texto }}</small>
                                        </div>
                                        <input pInputText id="cf-st" formControlName="seoTitulo" maxlength="120" [placeholder]="seo().nomeApp" aria-describedby="cf-st-dica" />
                                        <small id="cf-st-dica" class="text-muted-color">Ideal: de 30 a 60 caracteres. Vazio: usa o nome do app.</small>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex items-baseline justify-between gap-2">
                                            <label for="cf-sd" class="font-medium">Descrição</label>
                                            <small [class]="tamDescricao().classe">{{ tamDescricao().texto }}</small>
                                        </div>
                                        <textarea pTextarea id="cf-sd" formControlName="seoDescricao" rows="3" maxlength="300" [autoResize]="true" aria-describedby="cf-sd-dica"></textarea>
                                        <small id="cf-sd-dica" class="text-muted-color">Ideal: de 120 a 160 caracteres. Também aparece ao compartilhar links.</small>
                                    </div>
                                </section>

                                <!-- Palavras-chave -->
                                <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" aria-labelledby="seo-chaves">
                                    <div>
                                        <h3 id="seo-chaves" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-tags text-primary" aria-hidden="true"></i> Palavras-chave</h3>
                                        <p class="text-sm text-muted-color mt-1 mb-0">Termos que resumem o site. Têm pouco peso no Google hoje, mas outros buscadores ainda usam.</p>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex items-baseline justify-between gap-2">
                                            <label for="cf-sk" class="font-medium">Termos</label>
                                            <small [class]="tamPalavras().classe">{{ tamPalavras().texto }}</small>
                                        </div>
                                        <p-autocomplete
                                            inputId="cf-sk"
                                            formControlName="seoPalavrasChave"
                                            [multiple]="true"
                                            [typeahead]="false"
                                            separator=","
                                            [addOnBlur]="true"
                                            [unique]="false"
                                            [fluid]="true"
                                            [invalid]="form.controls.seoPalavrasChave.invalid"
                                            placeholder="Digite um termo e tecle Enter ou vírgula"
                                        />
                                        <small class="text-muted-color">Enter ou vírgula adiciona · clique no × de um termo para remover.</small>
                                        @if (form.controls.seoPalavrasChave.hasError('tamanho')) {
                                            <small class="text-red-600 dark:text-red-400" role="alert">Passou do limite de {{ limitePalavras }} caracteres. Remova algum termo.</small>
                                        }
                                    </div>
                                </section>

                                <!-- Compartilhamento -->
                                <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" aria-labelledby="seo-social">
                                    <div>
                                        <h3 id="seo-social" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-share-alt text-primary" aria-hidden="true"></i> Compartilhamento</h3>
                                        <p class="text-sm text-muted-color mt-1 mb-0">Imagem do cartão que aparece ao enviar um link do site no WhatsApp, Facebook, LinkedIn etc.</p>
                                    </div>
                                    <app-image-upload
                                        rotulo="Imagem de compartilhamento"
                                        formato="largo"
                                        [recorte]="recortes.compartilhamento"
                                        dica="Você enquadra a imagem antes de enviar · salva em 1200×630 px (JPG)"
                                        [url]="form.controls.seoImagemUrl.value"
                                        (urlChange)="form.controls.seoImagemUrl.setValue($event)"
                                    />
                                </section>
                            </div>

                            <!-- Prévias -->
                            <aside class="lg:col-span-2" aria-label="Prévias de como o site aparece">
                                <div class="lg:sticky lg:top-24 flex flex-col gap-6">
                                    <div class="flex flex-col gap-2">
                                        <h3 class="text-base font-semibold m-0">No Google</h3>
                                        <div class="p-4 rounded-border border border-surface bg-surface-0 dark:bg-surface-900 shadow-sm">
                                            <div class="flex items-center gap-2 mb-1">
                                                <span class="flex items-center justify-center w-7 h-7 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden shrink-0">
                                                    @if (seo().faviconUrl; as icone) {
                                                        <img [src]="icone" alt="" class="w-4 h-4" />
                                                    } @else {
                                                        <i class="pi pi-globe text-xs text-muted-color" aria-hidden="true"></i>
                                                    }
                                                </span>
                                                <span class="flex flex-col min-w-0 leading-tight">
                                                    <span class="text-sm truncate">{{ seo().nomeApp }}</span>
                                                    <span class="text-xs text-muted-color truncate">https://{{ dominio }}</span>
                                                </span>
                                            </div>
                                            <p class="text-lg text-[#1a0dab] dark:text-[#99c3ff] m-0 line-clamp-1">{{ tituloEfetivo() }}</p>
                                            <p class="text-sm text-muted-color m-0 mt-1 line-clamp-2">{{ seo().seoDescricao || 'Sem descrição: o Google vai escolher um trecho da página.' }}</p>
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <h3 class="text-base font-semibold m-0">Ao compartilhar</h3>
                                        <div class="rounded-border border border-surface overflow-hidden bg-surface-0 dark:bg-surface-900 shadow-sm">
                                            <div class="aspect-[1200/630] bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                                                @if (seo().seoImagemUrl; as imagem) {
                                                    <img [src]="imagem" alt="" class="w-full h-full object-cover" />
                                                } @else {
                                                    <span class="flex flex-col items-center gap-1 text-muted-color text-sm"><i class="pi pi-image text-2xl" aria-hidden="true"></i> Sem imagem</span>
                                                }
                                            </div>
                                            <div class="p-3 flex flex-col gap-0.5 border-t border-surface">
                                                <span class="text-xs uppercase text-muted-color truncate">{{ dominio }}</span>
                                                <span class="font-semibold line-clamp-1">{{ tituloEfetivo() }}</span>
                                                <span class="text-sm text-muted-color line-clamp-2">{{ seo().seoDescricao }}</span>
                                            </div>
                                        </div>
                                    </div>

                                    @if (seo().seoPalavrasChave.length) {
                                        <div class="flex flex-col gap-2">
                                            <h3 class="text-base font-semibold m-0">Palavras-chave</h3>
                                            <code class="text-xs p-3 rounded-border bg-surface-100 dark:bg-surface-800 break-words">&lt;meta name="keywords" content="{{ palavrasTexto() }}"&gt;</code>
                                        </div>
                                    }
                                </div>
                            </aside>
                        </div>
                    </p-tabpanel>
                    <p-tabpanel value="contato">
                        <div class="grid gap-8 lg:grid-cols-5">
                            <div class="lg:col-span-3 flex flex-col gap-6">
                                <!-- Atendimento -->
                                <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" aria-labelledby="ct-atend">
                                    <div>
                                        <h3 id="ct-atend" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-headphones text-primary" aria-hidden="true"></i> Atendimento</h3>
                                        <p class="text-sm text-muted-color mt-1 mb-0">Canais mostrados no rodapé do site. Deixe em branco o que não quiser exibir.</p>
                                    </div>
                                    <div class="grid gap-4 md:grid-cols-2">
                                        <div class="flex flex-col gap-2">
                                            <label for="cf-telefoneContato" class="font-medium flex items-center gap-2"><i class="pi pi-phone text-muted-color text-sm" aria-hidden="true"></i> Telefone</label>
                                            <app-telefone-input inputId="cf-telefoneContato" formControlName="telefoneContato" placeholder="Ex.: (61) 3333-4444" />
                                        </div>
                                        <div class="flex flex-col gap-2">
                                            <label for="cf-whatsapp" class="font-medium flex items-center gap-2"><i class="pi pi-whatsapp text-muted-color text-sm" aria-hidden="true"></i> WhatsApp</label>
                                            <app-telefone-input inputId="cf-whatsapp" formControlName="whatsapp" />
                                        </div>
                                        <div class="flex flex-col gap-2 md:col-span-2">
                                            <label for="cf-emailContato" class="font-medium flex items-center gap-2"><i class="pi pi-envelope text-muted-color text-sm" aria-hidden="true"></i> E-mail</label>
                                            <input
                                                pInputText
                                                id="cf-emailContato"
                                                type="email"
                                                formControlName="emailContato"
                                                maxlength="160"
                                                placeholder="contato@seudominio.com.br"
                                                [invalid]="erro('emailContato')"
                                                aria-describedby="cf-email-erro"
                                            />
                                            @if (erro('emailContato')) {
                                                <small id="cf-email-erro" class="text-red-600 dark:text-red-400" role="alert">E-mail inválido.</small>
                                            }
                                        </div>
                                        <div class="flex flex-col gap-2 md:col-span-2">
                                            <label for="cf-endereco" class="font-medium flex items-center gap-2"><i class="pi pi-map-marker text-muted-color text-sm" aria-hidden="true"></i> Endereço</label>
                                            <input pInputText id="cf-endereco" formControlName="endereco" maxlength="200" placeholder="Ex.: SCS Quadra 1, Bloco A, sala 101 · Brasília-DF" />
                                        </div>
                                    </div>
                                </section>

                                <!-- Redes sociais -->
                                <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" aria-labelledby="ct-redes">
                                    <div>
                                        <h3 id="ct-redes" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-share-alt text-primary" aria-hidden="true"></i> Redes sociais</h3>
                                        <p class="text-sm text-muted-color mt-1 mb-0">Endereço completo do perfil, começando com https://. Vira um ícone no rodapé.</p>
                                    </div>
                                    @for (r of redes; track r.campo) {
                                        <div class="flex flex-col gap-2">
                                            <label [for]="'cf-' + r.campo" class="font-medium flex items-center gap-2"><i [class]="'pi ' + r.icone + ' text-muted-color text-sm'" aria-hidden="true"></i> {{ r.label }}</label>
                                            <div class="flex gap-2">
                                                <input
                                                    pInputText
                                                    [id]="'cf-' + r.campo"
                                                    type="url"
                                                    [formControlName]="r.campo"
                                                    maxlength="200"
                                                    [placeholder]="r.exemplo"
                                                    class="flex-1 min-w-0"
                                                    [invalid]="erro(r.campo)"
                                                    [attr.aria-describedby]="'cf-' + r.campo + '-erro'"
                                                />
                                                @if (seo()[r.campo] && !erro(r.campo)) {
                                                    <a
                                                        pButton
                                                        [href]="seo()[r.campo]"
                                                        target="_blank"
                                                        rel="noopener"
                                                        icon="pi pi-external-link"
                                                        severity="secondary"
                                                        [outlined]="true"
                                                        [attr.aria-label]="'Abrir ' + r.label + ' em nova aba'"
                                                        pTooltip="Testar o link"
                                                    ></a>
                                                }
                                            </div>
                                            @if (erro(r.campo)) {
                                                <small [id]="'cf-' + r.campo + '-erro'" class="text-red-600 dark:text-red-400" role="alert">Use o endereço completo, começando com https://</small>
                                            }
                                        </div>
                                    }
                                </section>

                                <!-- Rodapé -->
                                <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" aria-labelledby="ct-rodape">
                                    <div>
                                        <h3 id="ct-rodape" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-align-left text-primary" aria-hidden="true"></i> Rodapé</h3>
                                        <p class="text-sm text-muted-color mt-1 mb-0">Texto curto de apresentação, abaixo do logo no rodapé de todas as páginas.</p>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex items-baseline justify-between gap-2">
                                            <label for="cf-rod" class="font-medium">Texto do rodapé</label>
                                            <small class="text-muted-color">{{ seo().textoRodape.length }}/300</small>
                                        </div>
                                        <textarea pTextarea id="cf-rod" formControlName="textoRodape" rows="3" maxlength="300" [autoResize]="true"></textarea>
                                    </div>
                                </section>
                            </div>

                            <!-- Prévia do rodapé -->
                            <aside class="lg:col-span-2" aria-labelledby="ct-previa">
                                <div class="lg:sticky lg:top-24 flex flex-col gap-3">
                                    <div class="flex items-center justify-between">
                                        <h3 id="ct-previa" class="text-base font-semibold m-0">Prévia do rodapé</h3>
                                        <span class="text-xs text-muted-color">Aparece na hora · vale para todos ao salvar</span>
                                    </div>
                                    <div class="rounded-border border border-surface overflow-hidden bg-surface-0 dark:bg-surface-900 shadow-sm text-sm">
                                        <div class="p-4 flex flex-col gap-4">
                                            <div class="flex flex-col gap-3">
                                                <app-logo [nome]="seo().nomeApp" [slogan]="seo().slogan || null" [logoUrl]="seo().logoUrl" [logoEscuroUrl]="seo().logoEscuroUrl" />
                                                @if (seo().textoRodape.trim()) {
                                                    <p class="text-muted-color m-0">{{ seo().textoRodape }}</p>
                                                }
                                                <div>
                                                    <div class="font-semibold mb-2">Siga-nos</div>
                                                    <div class="flex gap-3 text-lg">
                                                        @for (r of redes; track r.campo) {
                                                            @if (seo()[r.campo] && !erro(r.campo)) {
                                                                <i [class]="'pi ' + r.icone + ' text-primary'" [attr.aria-label]="r.label" role="img"></i>
                                                            }
                                                        }
                                                        @if (!temRedes()) {
                                                            <span class="text-xs text-muted-color">Nenhuma rede informada</span>
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="border-t border-surface pt-4">
                                                <div class="font-semibold mb-2">Atendimento</div>
                                                <ul class="list-none p-0 m-0 flex flex-col gap-2">
                                                    @for (l of linhasAtendimento(); track l.icone) {
                                                        <li class="flex items-start gap-2 break-words">
                                                            <i [class]="'pi ' + l.icone + ' text-muted-color mt-0.5'" aria-hidden="true"></i><span class="min-w-0">{{ l.texto }}</span>
                                                        </li>
                                                    } @empty {
                                                        <li class="text-xs text-muted-color">Nenhum canal informado</li>
                                                    }
                                                </ul>
                                            </div>
                                        </div>
                                        <div class="border-t border-surface px-4 py-3 text-center text-xs text-muted-color">© {{ ano }} {{ seo().nomeApp }}. Todos os direitos reservados.</div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </p-tabpanel>
                    <p-tabpanel value="tema">
                        <div class="grid gap-8 lg:grid-cols-5">
                            <div class="lg:col-span-3 flex flex-col gap-6">
                                <div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-border bg-surface-50 dark:bg-surface-800">
                                    <div class="flex items-center gap-2 text-sm min-w-0">
                                        <i class="pi pi-palette text-primary" aria-hidden="true"></i>
                                        <span class="text-muted-color">Tema atual:</span>
                                        <span class="font-medium truncate">{{ resumoTema() }}</span>
                                        @if (temaAlterado()) {
                                            <p-tag value="Não salvo" severity="warn" [rounded]="true" />
                                        }
                                    </div>
                                    <p-button label="Desfazer alterações" icon="pi pi-undo" size="small" [text]="true" [disabled]="!temaAlterado()" (onClick)="desfazerTema()" />
                                </div>
                                <app-theme-picker [value]="tema()" (valueChange)="mudarTema($event)" />
                            </div>

                            <aside class="lg:col-span-2" aria-labelledby="cf-previa">
                                <div class="lg:sticky lg:top-24 flex flex-col gap-3">
                                    <div class="flex items-center justify-between">
                                        <h3 id="cf-previa" class="text-base font-semibold m-0">Prévia</h3>
                                        <span class="text-xs text-muted-color">Aparece na hora · vale para todos ao salvar</span>
                                    </div>
                                    <div class="rounded-border border border-surface overflow-hidden bg-surface-0 dark:bg-surface-900 shadow-sm">
                                        <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-surface">
                                            <app-logo />
                                            <span class="hidden sm:flex gap-3 text-sm text-muted-color" aria-hidden="true"><span>Venda</span><span>Aluguel</span><span class="text-primary font-medium">Anunciar</span></span>
                                        </div>
                                        <div class="p-4 flex flex-col gap-4 bg-surface-50 dark:bg-surface-950">
                                            <div class="rounded-border overflow-hidden border border-surface bg-surface-0 dark:bg-surface-900">
                                                <div class="h-24 bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center" aria-hidden="true">
                                                    <i class="pi pi-home text-primary" style="font-size: 2.5rem"></i>
                                                </div>
                                                <div class="p-3 flex flex-col gap-2">
                                                    <div class="flex items-center gap-2">
                                                        <p-tag value="Venda" [rounded]="true" />
                                                        <span class="text-xs text-muted-color">Asa Norte · Brasília</span>
                                                    </div>
                                                    <span class="font-medium">Apartamento 3 quartos, nascente</span>
                                                    <span class="text-lg font-bold text-primary">R$ 1.190.000,00</span>
                                                    <div class="flex flex-wrap gap-2">
                                                        <p-button label="Ver imóvel" size="small" />
                                                        <p-button label="Favoritar" icon="pi pi-heart" severity="secondary" size="small" [outlined]="true" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="cf-previa-campo" class="text-sm">Campo de exemplo</label>
                                                <input pInputText id="cf-previa-campo" placeholder="Digite um bairro" />
                                            </div>
                                            <p-message severity="info" size="small" icon="pi pi-info-circle">Mensagens e avisos seguem o tema.</p-message>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </p-tabpanel>
                    <p-tabpanel value="regras">
                        <div class="grid gap-8 lg:grid-cols-5">
                            <div class="lg:col-span-3 flex flex-col gap-6">
                                <!-- Liga/desliga do site, agrupados por assunto (regra nova: só incluir em gruposRegras) -->
                                @for (g of gruposRegras; track g.id) {
                                    <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" [attr.aria-labelledby]="'rg-' + g.id">
                                        <div>
                                            <h3 [id]="'rg-' + g.id" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi {{ g.icone }} text-primary" aria-hidden="true"></i> {{ g.titulo }}</h3>
                                            <p class="text-sm text-muted-color mt-1 mb-0">{{ g.descricao }}</p>
                                        </div>
                                        @for (r of g.regras; track r.campo) {
                                            <div class="flex items-start justify-between gap-4 py-3 border-t border-surface first-of-type:border-t-0 first-of-type:pt-0">
                                                <div class="flex flex-col gap-1 min-w-0">
                                                    <label [for]="'cf-' + r.campo" class="font-medium cursor-pointer">{{ r.label }}</label>
                                                    <small [id]="'cf-' + r.campo + '-dica'" class="text-muted-color">{{ seo()[r.campo] ? r.ligado : r.desligado }}</small>
                                                </div>
                                                <p-toggleswitch [formControlName]="r.campo" [inputId]="'cf-' + r.campo" [ariaLabelledBy]="'cf-' + r.campo + '-dica'" class="shrink-0" />
                                            </div>
                                        }
                                    </section>
                                }

                                <!-- Prazo da remoção de conta pedida pelo usuário -->
                                <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" aria-labelledby="rg-exclusao">
                                    <div>
                                        <h3 id="rg-exclusao" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-hourglass text-primary" aria-hidden="true"></i> Prazo para remover a conta</h3>
                                        <p class="text-sm text-muted-color mt-1 mb-0">Tempo entre o pedido de "Remover conta" e a remoção definitiva, feita todo dia às 03:00. Nesse período a conta funciona normalmente e o usuário pode desistir.</p>
                                    </div>
                                    <div class="flex flex-col gap-2 sm:max-w-xs">
                                        <label for="cf-dias-exclusao" class="font-medium">Tempo de espera</label>
                                        <p-select inputId="cf-dias-exclusao" formControlName="diasEsperaExclusao" [options]="diasEspera" optionLabel="label" optionValue="value" aria-describedby="cf-dias-exclusao-dica" />
                                        <small id="cf-dias-exclusao-dica" class="text-muted-color">
                                            {{ seo().autoExclusaoConta ? 'Vale para os pedidos feitos depois de salvar; os já agendados mantêm a data.' : 'A remoção pelo próprio usuário está desligada (grupo Contas e privacidade). Pedidos já agendados continuam valendo.' }}
                                        </small>
                                    </div>
                                </section>

                                <!-- Telefone do anunciante -->
                                <section class="flex flex-col gap-4 p-4 rounded-border border border-surface" aria-labelledby="rg-tel">
                                    <div>
                                        <h3 id="rg-tel" class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-phone text-primary" aria-hidden="true"></i> Telefone do anunciante</h3>
                                        <p class="text-sm text-muted-color mt-1 mb-0">Como o telefone do corretor ou da imobiliária aparece na página do imóvel.</p>
                                    </div>
                                    <div role="radiogroup" aria-labelledby="rg-tel" class="flex flex-col gap-3">
                                        @for (o of exibicoesTelefone; track o.value) {
                                            <label
                                                [for]="'cf-tel-' + o.value"
                                                class="flex items-start gap-3 p-3 rounded-border border cursor-pointer transition-colors hover:border-primary"
                                                [class]="seo().telefoneAnunciante === o.value ? 'border-primary bg-primary-50 dark:bg-primary-950/40' : 'border-surface'"
                                            >
                                                <p-radiobutton formControlName="telefoneAnunciante" name="telefoneAnunciante" [value]="o.value" [inputId]="'cf-tel-' + o.value" class="mt-0.5" />
                                                <span class="flex flex-col gap-1 min-w-0">
                                                    <span class="font-medium">{{ o.label }}</span>
                                                    <span class="text-sm text-muted-color">{{ o.dica }}</span>
                                                </span>
                                            </label>
                                        }
                                    </div>
                                </section>
                            </div>

                            <!-- Prévia do contato -->
                            <aside class="lg:col-span-2" aria-labelledby="rg-previa">
                                <div class="lg:sticky lg:top-24 flex flex-col gap-3">
                                    <div class="flex items-center justify-between">
                                        <h3 id="rg-previa" class="text-base font-semibold m-0">Prévia na página do imóvel</h3>
                                        <span class="text-xs text-muted-color">Vale ao salvar</span>
                                    </div>
                                    <div class="p-4 rounded-border border border-surface bg-surface-0 dark:bg-surface-900 shadow-sm flex flex-col gap-3 text-sm" aria-hidden="true">
                                        <div class="flex items-center gap-3">
                                            <span class="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary shrink-0"><i class="pi pi-user"></i></span>
                                            <span class="flex flex-col min-w-0">
                                                <span class="font-semibold">Corretor de exemplo</span>
                                                <span class="text-xs text-muted-color">CRECI 00000-DF</span>
                                            </span>
                                        </div>
                                        @switch (seo().telefoneAnunciante) {
                                            @case ('MOSTRAR') {
                                                <span class="flex items-center gap-2 font-medium"><i class="pi pi-phone text-primary"></i> (61) 99999-1234</span>
                                            }
                                            @case ('MOSTRAR_APENAS_LOGADO') {
                                                <span class="flex flex-wrap items-center justify-between gap-2">
                                                    <span class="flex items-center gap-2 font-medium"><i class="pi pi-phone text-primary"></i> (61) 99999…</span>
                                                    <span class="text-primary font-medium">Ver telefone</span>
                                                </span>
                                            }
                                            @default {
                                                <span class="flex items-center gap-2 text-muted-color"><i class="pi pi-eye-slash"></i> Telefone não exibido</span>
                                            }
                                        }
                                        <span class="flex items-center justify-center gap-2 py-2 rounded-border bg-primary text-primary-contrast font-medium"><i class="pi pi-envelope"></i> Enviar mensagem</span>
                                    </div>
                                    <small class="text-muted-color">
                                        <i class="pi pi-external-link text-xs" aria-hidden="true"></i>
                                        {{ seo().abrirAnuncioNovaJanela ? 'Ao clicar num anúncio da busca, a página abre em nova aba.' : 'Ao clicar num anúncio da busca, a página abre na mesma aba.' }}
                                    </small>
                                </div>
                            </aside>
                        </div>
                    </p-tabpanel>
                    <p-tabpanel value="documentos">
                        <app-documentos-lista />
                    </p-tabpanel>
                </p-tabpanels>
            </p-tabs>
        </form>
    `
})
export class ConfiguracoesPage {
    /** Aba aberta ao entrar (?aba=documentos volta direto para a lista de documentos). */
    readonly abaInicial = inject(ActivatedRoute).snapshot.queryParamMap.get('aba') ?? 'identidade';
    readonly recortes = RECORTES;
    private config = inject(ConfigService);
    private theme = inject(ThemeService);
    private msg = inject(MessageService);
    private fb = inject(NonNullableFormBuilder);

    salvando = signal(false);
    tema = signal<ThemeChoice>({ preset: 'Aura', primary: 'marinho', surface: null, mode: 'auto' });
    /** Tema como está salvo no sistema (para "Não salvo" e "Desfazer alterações"). */
    private temaSalvo = signal<ThemeChoice>(this.tema());
    temaAlterado = computed(() => {
        const a = this.tema();
        const b = this.temaSalvo();
        return a.preset !== b.preset || a.primary !== b.primary || (a.surface ?? 'slate') !== (b.surface ?? 'slate') || a.mode !== b.mode;
    });
    resumoTema = computed(() => {
        const t = this.tema();
        const modo = { light: 'Claro', dark: 'Escuro', auto: 'Automático' }[t.mode];
        const cor = this.theme.primaryOptions(t.preset).find((c) => c.name === t.primary)?.label ?? t.primary;
        const surface = this.theme.surfaces.find((s) => s.name === (t.surface ?? 'slate'))?.label;
        return `${t.preset} · ${cor} · ${surface} · ${modo}`;
    });

    form = this.fb.group({
        nomeApp: ['', [Validators.required, Validators.maxLength(80)]],
        slogan: [''],
        logoUrl: this.fb.control<string | null>(null),
        logoEscuroUrl: this.fb.control<string | null>(null),
        faviconUrl: this.fb.control<string | null>(null),
        seoTitulo: [''],
        seoDescricao: [''],
        seoPalavrasChave: this.fb.control<string[]>([], limiteDePalavras),
        seoImagemUrl: this.fb.control<string | null>(null),
        emailContato: ['', Validators.email],
        telefoneContato: [''],
        whatsapp: [''],
        endereco: [''],
        instagram: ['', Validators.pattern(URL_HTTP)],
        facebook: ['', Validators.pattern(URL_HTTP)],
        textoRodape: [''],
        moderarAnuncios: [false],
        permitirCadastroCorretor: [true],
        abrirAnuncioNovaJanela: [false],
        telefoneAnunciante: this.fb.control<ExibicaoTelefone>('MOSTRAR'),
        simulacaoFinanciamento: [true],
        alertaQuedaPreco: [true],
        impressaoAnuncio: [true],
        autoExclusaoConta: [true],
        diasEsperaExclusao: [7]
    });

    /** Opções do prazo de espera da remoção de conta. */
    readonly diasEspera = [1, 2, 3, 5, 7, 10, 15, 30, 60, 90].map((d) => ({ value: d, label: d === 1 ? '1 dia' : `${d} dias` }));

    readonly exibicoesTelefone = EXIBICOES_TELEFONE;
    /**
     * Liga/desliga da aba Regras, agrupados por assunto, com o efeito de cada estado.
     * A aba Regras é o lugar dos recursos que o administrador ativa ou desativa no site: regra nova entra aqui
     * (campo boolean na configuração + item no grupo certo).
     */
    readonly gruposRegras = [
        {
            id: 'mod',
            titulo: 'Moderação e cadastro',
            icone: 'pi-shield',
            descricao: 'Quem pode anunciar e se o anúncio passa por revisão antes de ir ao ar.',
            regras: [
                {
                    campo: 'moderarAnuncios',
                    label: 'Aprovar anúncios antes de publicar',
                    ligado: 'Anúncios novos de corretores ficam aguardando até um administrador aprovar.',
                    desligado: 'Anúncios novos vão ao ar na hora; a moderação acontece depois, por denúncia.'
                },
                {
                    campo: 'permitirCadastroCorretor',
                    label: 'Cadastro de corretores e imobiliárias pelo site',
                    ligado: 'Qualquer corretor ou imobiliária pode criar a conta e começar a anunciar.',
                    desligado: 'Só um administrador cria contas de corretor; o cadastro pelo site fica fechado.'
                },
                {
                    campo: 'abrirAnuncioNovaJanela',
                    label: 'Abrir anúncios em nova aba',
                    ligado: 'A página do imóvel abre em outra aba, e a busca continua aberta.',
                    desligado: 'A página do imóvel abre na mesma aba da busca.'
                }
            ]
        },
        {
            id: 'recursos',
            titulo: 'Recursos para o comprador',
            icone: 'pi-sparkles',
            descricao: 'Ferramentas extras na página do imóvel e no painel do cliente.',
            regras: [
                {
                    campo: 'simulacaoFinanciamento',
                    label: 'Simulação de financiamento',
                    ligado: 'Anúncios de venda que aceitam financiamento mostram o botão "Simular financiamento", e o painel do cliente traz o resumo de financiamento.',
                    desligado: 'O botão de simular e o resumo somem do site. O cadastro de financeiras (menu Financeiras) e as escolhas dos anúncios continuam guardados.'
                },
                {
                    campo: 'alertaQuedaPreco',
                    label: 'Aviso de queda de preço nos favoritos',
                    ligado: 'O cliente vê quais favoritos baixaram de preço desde que foram salvos (painel e página de favoritos).',
                    desligado: 'O aviso some do site. As mudanças de preço continuam registradas e voltam a aparecer ao religar.'
                },
                {
                    campo: 'impressaoAnuncio',
                    label: 'Ficha do imóvel para imprimir',
                    ligado: 'A página do imóvel mostra o botão de imprimir: uma folha A4 com fotos, valores e condições da finalidade, QR code do anúncio e espaço para anotações da visita.',
                    desligado: 'O botão de imprimir some da página do imóvel e a ficha deixa de abrir.'
                }
            ]
        },
        {
            id: 'contas',
            titulo: 'Contas e privacidade',
            icone: 'pi-user',
            descricao: 'O que o próprio usuário pode fazer com a conta dele (LGPD).',
            regras: [
                {
                    campo: 'autoExclusaoConta',
                    label: 'Remover conta pelo próprio usuário',
                    ligado: 'Clientes, corretores e imobiliárias veem "Remover conta" em Meus dados. A conta e os dados são apagados depois do prazo de espera, e até lá o usuário pode desistir.',
                    desligado: 'O botão some de Meus dados; para sair, o usuário precisa pedir ao suporte. Pedidos já agendados continuam valendo.'
                }
            ]
        }
    ] as const;

    // --- SEO: prévias e contadores ---
    readonly limitePalavras = LIMITE_PALAVRAS;
    readonly dominio = location.host;
    seo = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), { initialValue: this.form.getRawValue() });
    nomeInvalido = computed(() => { this.seo(); return this.form.controls.nomeApp.invalid && (this.form.controls.nomeApp.touched || this.form.controls.nomeApp.dirty); });
    // --- Contato: prévia do rodapé ---
    readonly ano = new Date().getFullYear();
    readonly redes = [
        { campo: 'instagram', label: 'Instagram', icone: 'pi-instagram', exemplo: 'https://instagram.com/seuperfil' },
        { campo: 'facebook', label: 'Facebook', icone: 'pi-facebook', exemplo: 'https://facebook.com/suapagina' }
    ] as const;
    temRedes = computed(() => this.redes.some((r) => this.seo()[r.campo] && !this.erro(r.campo)));
    linhasAtendimento = computed(() => {
        const v = this.seo();
        return [
            { icone: 'pi-phone', texto: formatarTelefone(v.telefoneContato) },
            { icone: 'pi-whatsapp', texto: formatarTelefone(v.whatsapp) },
            { icone: 'pi-envelope', texto: this.erro('emailContato') ? null : v.emailContato.trim() },
            { icone: 'pi-map-marker', texto: v.endereco.trim() }
        ].filter((l): l is { icone: string; texto: string } => !!l.texto);
    });

    /** Campo com erro de validação (depois de mexido), para destacar e mostrar a mensagem. */
    erro(campo: 'emailContato' | 'instagram' | 'facebook') {
        this.seo();
        const c = this.form.controls[campo];
        return c.invalid && (c.dirty || c.touched);
    }

    tituloEfetivo = computed(() => this.seo().seoTitulo.trim() || this.seo().nomeApp);
    palavrasTexto = computed(() => juntarPalavras(this.seo().seoPalavrasChave));
    tamTitulo = computed(() => avaliarTamanho(this.seo().seoTitulo.trim().length, 30, 60, 'vazio: usa o nome do app'));
    tamDescricao = computed(() => avaliarTamanho(this.seo().seoDescricao.trim().length, 120, 160, 'recomendado preencher'));
    tamPalavras = computed(() => {
        const n = this.palavrasTexto().length;
        const termos = this.seo().seoPalavrasChave.length;
        return { texto: `${termos} ${termos === 1 ? 'termo' : 'termos'} · ${n}/${LIMITE_PALAVRAS}`, classe: n > LIMITE_PALAVRAS ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-color' };
    });

    /** Tira espaços, termos vazios e repetidos (sem diferenciar maiúsculas) a cada mudança da lista. */
    normalizarPalavras() {
        const ctrl = this.form.controls.seoPalavrasChave;
        const limpas = separarPalavras(juntarPalavras(ctrl.value));
        if (limpas.join('\u0000') !== ctrl.value.join('\u0000')) ctrl.setValue(limpas);
    }

    constructor() {
        // pré-visualização do tema sem salvar: ao sair, volta ao tema do sistema
        inject(DestroyRef).onDestroy(() => this.theme.restaurar());
        // repetido é aceito pelo campo e descartado aqui, para o texto digitado não ficar preso no input;
        // roda logo depois (asap) para não interferir no tratamento da tecla do AutoComplete
        this.form.controls.seoPalavrasChave.valueChanges.pipe(observeOn(asapScheduler), takeUntilDestroyed()).subscribe(() => this.normalizarPalavras());
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
            seoPalavrasChave: separarPalavras(c.seoPalavrasChave),
            seoImagemUrl: c.seoImagemUrl,
            emailContato: c.emailContato ?? '',
            telefoneContato: c.telefoneContato ?? '',
            whatsapp: c.whatsapp ?? '',
            endereco: c.endereco ?? '',
            instagram: c.instagram ?? '',
            facebook: c.facebook ?? '',
            textoRodape: c.textoRodape ?? '',
            moderarAnuncios: c.moderarAnuncios,
            permitirCadastroCorretor: c.permitirCadastroCorretor,
            abrirAnuncioNovaJanela: c.abrirAnuncioNovaJanela,
            telefoneAnunciante: c.telefoneAnunciante ?? 'MOSTRAR',
            simulacaoFinanciamento: c.simulacaoFinanciamento ?? true,
            alertaQuedaPreco: c.alertaQuedaPreco ?? true,
            impressaoAnuncio: c.impressaoAnuncio ?? true,
            autoExclusaoConta: c.autoExclusaoConta ?? true,
            diasEsperaExclusao: c.diasEsperaExclusao ?? 7
        });
        this.tema.set({ preset: c.temaPreset as PresetName, primary: c.temaPrimaria, surface: c.temaSurface, mode: c.temaModo });
        this.temaSalvo.set(this.tema());
    }

    mudarTema(t: ThemeChoice) {
        this.tema.set(t);
        this.theme.apply(t);
    }

    desfazerTema() {
        this.mudarTema(this.temaSalvo());
    }

    salvar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            const f = this.form.controls;
            const motivo = f.nomeApp.invalid
                ? { summary: 'Informe o nome do app', detail: 'Aba Identidade.' }
                : f.seoPalavrasChave.invalid
                  ? { summary: 'Palavras-chave longas demais', detail: `O total passou de ${LIMITE_PALAVRAS} caracteres (aba SEO).` }
                  : { summary: 'Confira os dados de contato', detail: 'E-mail ou endereço de rede social inválido (aba Contato).' };
            this.msg.add({ severity: 'warn', ...motivo });
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
            seoPalavrasChave: nulo(juntarPalavras(v.seoPalavrasChave)),
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
                this.temaSalvo.set(t);
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

/** Endereço de perfil em rede social: precisa ser um link completo. */
const URL_HTTP = /^https?:\/\/\S+\.\S+$/;

/** Limite do backend para as palavras-chave (texto separado por vírgula). */
const LIMITE_PALAVRAS = 300;

/** "a, b,  c" -> ["a", "b", "c"], sem vazios e sem repetidos (ignora maiúsculas). */
function separarPalavras(texto: string | null): string[] {
    const vistos = new Set<string>();
    return (texto ?? '')
        .split(',')
        .map((p) => p.trim().replace(/\s+/g, ' '))
        .filter((p) => p && !vistos.has(p.toLowerCase()) && vistos.add(p.toLowerCase()));
}

function juntarPalavras(lista: string[]): string {
    return lista.join(', ');
}

function limiteDePalavras(c: AbstractControl<string[]>): ValidationErrors | null {
    return juntarPalavras(c.value ?? []).length > LIMITE_PALAVRAS ? { tamanho: true } : null;
}

/** Contador com faixa ideal: verde dentro da faixa, âmbar fora, neutro quando vazio. */
function avaliarTamanho(n: number, min: number, max: number, vazio: string) {
    if (n === 0) return { texto: `0 · ${vazio}`, classe: 'text-muted-color' };
    const ok = n >= min && n <= max;
    return {
        texto: `${n} caracteres · ${ok ? 'bom' : n < min ? 'curto' : 'longo, pode ser cortado'}`,
        classe: ok ? 'text-green-700 dark:text-green-400 font-medium' : 'text-amber-700 dark:text-amber-400 font-medium'
    };
}
