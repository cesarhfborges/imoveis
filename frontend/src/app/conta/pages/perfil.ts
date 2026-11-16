import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { startWith } from 'rxjs';
import { ContaService } from '@/app/core/services/conta.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PerfilForm, UFS, Usuario } from '@/app/core/models/models';
import { PageHeader } from '@/app/shared/components/page-header';
import { ImageUpload } from '@/app/shared/components/image-upload';
import { RECORTES } from '@/app/shared/components/image-editor';
import { TelefoneInput } from '@/app/shared/components/telefone-input';
import { DocumentoPipe } from '@/app/core/pipes/formatos';
import { iniciaisDe } from '@/app/shared/components/avatar';

const ANO_ATUAL = new Date().getFullYear();
const MAX_SOBRE = 2000;

/** Meus dados (qualquer perfil): identificação, contato, atuação profissional (anunciantes), endereço e senha. */
@Component({
    selector: 'app-perfil-page',
    imports: [DatePipe, ReactiveFormsModule, InputTextModule, InputMaskModule, InputNumberModule, InputGroupModule, InputGroupAddonModule, SelectModule, TextareaModule, PasswordModule, ButtonModule, TagModule, PageHeader, ImageUpload, TelefoneInput, DocumentoPipe],
    template: `
        <app-page-header titulo="Meus dados" subtitulo="Como você aparece no portal e como os clientes falam com você" />

        <div class="perfil">
            <!-- cartão lateral: foto, resumo e completude -->
            <aside class="perfil__lado">
                <div class="card !mb-0 flex flex-col items-center text-center gap-3">
                    <app-image-upload
                        rotulo="Foto ou logo"
                        formato="circulo"
                        [vertical]="true"
                        [iniciais]="iniciais()"
                        [permitirUrl]="false"
                        endpoint="/app/conta/foto"
                        aceitar="image/png,image/jpeg,image/webp"
                        dica="JPG, PNG ou WEBP · você enquadra a foto antes de enviar"
                        [recorte]="recorteFoto"
                        [url]="dados.controls.fotoUrl.value"
                        (urlChange)="mudarFoto($event)"
                    />
                    <div class="min-w-0 w-full">
                        <div class="text-lg font-semibold truncate">{{ nome() || 'Seu nome' }}</div>
                        <div class="text-sm text-muted-color truncate">{{ usuario()?.email }}</div>
                    </div>
                    <div class="flex flex-wrap justify-center gap-2">
                        <p-tag [value]="tipoRotulo()" [severity]="anunciante() ? 'info' : 'secondary'" [icon]="imobiliaria() ? 'pi pi-building' : anunciante() ? 'pi pi-id-card' : 'pi pi-user'" />
                        @if (usuario()?.creci) {
                            <p-tag [value]="'CRECI ' + usuario()!.creci + (usuario()!.creciUf ? '-' + usuario()!.creciUf : '')" severity="secondary" />
                        }
                    </div>
                    @if (usuario(); as u) {
                        <div class="text-xs text-muted-color">Cadastro em {{ u.criadoEm | date: 'dd/MM/yyyy' }}</div>
                    }
                </div>

                <div class="card !mb-0">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-semibold">Perfil completo</span>
                        <span class="font-semibold" [class.text-green-700]="completude().pct === 100">{{ completude().pct }}%</span>
                    </div>
                    <div class="perfil__barra" role="progressbar" [attr.aria-valuenow]="completude().pct" aria-valuemin="0" aria-valuemax="100" aria-label="Perfil completo">
                        <span [style.width.%]="completude().pct"></span>
                    </div>
                    @if (completude().faltando.length) {
                        <p class="text-sm text-muted-color mt-3 mb-1">{{ anunciante() ? 'Perfis completos passam mais confiança aos clientes.' : 'Complete para agilizar seus contatos.' }} Falta:</p>
                        <ul class="list-none p-0 m-0 flex flex-col gap-1 text-sm">
                            @for (f of completude().faltando; track f) {
                                <li><i class="pi pi-circle text-xs text-muted-color mr-2" aria-hidden="true"></i>{{ f }}</li>
                            }
                        </ul>
                    } @else {
                        <p class="text-sm text-green-700 mt-2! mb-0"><i class="pi pi-check-circle mr-1" aria-hidden="true"></i>Tudo preenchido.</p>
                    }
                </div>
            </aside>

            <div class="perfil__principal">
                <form class="flex flex-col gap-4" [formGroup]="dados" (ngSubmit)="salvar()" novalidate>
                    <!-- identificação -->
                    <section class="card !mb-0" aria-labelledby="sec-id">
                        <h2 id="sec-id" class="perfil__titulo"><i class="pi pi-id-card" aria-hidden="true"></i>{{ imobiliaria() ? 'Dados da imobiliária' : 'Dados pessoais' }}</h2>
                        <div class="grid gap-4 sm:grid-cols-2">
                            <div class="flex flex-col gap-2 sm:col-span-2">
                                <label for="pf-nome">{{ imobiliaria() ? 'Nome fantasia (como aparece nos anúncios)' : 'Nome completo' }} <span class="text-red-600" aria-hidden="true">*</span></label>
                                <input pInputText id="pf-nome" formControlName="nome" autocomplete="name" aria-required="true" [attr.aria-invalid]="invalido('nome')" aria-describedby="pf-nome-erro" />
                                @if (invalido('nome')) {
                                    <small id="pf-nome-erro" class="text-red-600">Informe o nome.</small>
                                }
                            </div>
                            @if (imobiliaria()) {
                                <div class="flex flex-col gap-2 sm:col-span-2">
                                    <label for="pf-razao">Razão social</label>
                                    <input pInputText id="pf-razao" formControlName="razaoSocial" autocomplete="organization" />
                                </div>
                            }
                            <div class="flex flex-col gap-2">
                                <label for="pf-email">E-mail de acesso</label>
                                <input pInputText id="pf-email" [value]="usuario()?.email ?? ''" readonly aria-describedby="pf-email-dica" />
                                <small id="pf-email-dica" class="text-muted-color">Usado para entrar. Para trocar, fale com o suporte.</small>
                            </div>
                            @if (usuario()?.documento) {
                                <div class="flex flex-col gap-2">
                                    <label for="pf-doc">{{ imobiliaria() ? 'CNPJ' : 'CPF' }}</label>
                                    <input pInputText id="pf-doc" [value]="usuario()!.documento | documento" readonly />
                                </div>
                            }
                        </div>
                    </section>

                    <!-- contato -->
                    <section class="card !mb-0" aria-labelledby="sec-contato">
                        <h2 id="sec-contato" class="perfil__titulo"><i class="pi pi-phone" aria-hidden="true"></i>Contato</h2>
                        <div class="grid gap-4 sm:grid-cols-2">
                            <div class="flex flex-col gap-2">
                                <label for="pf-tel">Telefone</label>
                                <app-telefone-input inputId="pf-tel" formControlName="telefone" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="pf-whats">WhatsApp</label>
                                <app-telefone-input inputId="pf-whats" formControlName="whatsapp" />
                                @if (dados.controls.telefone.value && !dados.controls.whatsapp.value) {
                                    <button type="button" class="perfil__link" (click)="dados.controls.whatsapp.setValue(dados.controls.telefone.value)">Usar o mesmo número do telefone</button>
                                }
                            </div>
                            @if (anunciante()) {
                                <div class="flex flex-col gap-2 sm:col-span-2">
                                    <label for="pf-email-contato">E-mail para clientes</label>
                                    <input
                                        pInputText
                                        id="pf-email-contato"
                                        type="email"
                                        formControlName="emailContato"
                                        autocomplete="email"
                                        placeholder="Deixe vazio para usar o e-mail de acesso"
                                        [attr.aria-invalid]="invalido('emailContato')"
                                        aria-describedby="pf-email-contato-erro"
                                    />
                                    @if (invalido('emailContato')) {
                                        <small id="pf-email-contato-erro" class="text-red-600">E-mail inválido.</small>
                                    }
                                </div>
                            }
                        </div>
                    </section>

                    <!-- atuação profissional -->
                    @if (anunciante()) {
                        <section class="card !mb-0" aria-labelledby="sec-atuacao">
                            <h2 id="sec-atuacao" class="perfil__titulo"><i class="pi pi-briefcase" aria-hidden="true"></i>Atuação profissional</h2>
                            <div class="grid gap-4 sm:grid-cols-6">
                                <div class="flex flex-col gap-2 sm:col-span-3">
                                    <label for="pf-creci">CRECI</label>
                                    <input pInputText id="pf-creci" formControlName="creci" />
                                </div>
                                <div class="flex flex-col gap-2 sm:col-span-1">
                                    <label for="pf-creci-uf">UF</label>
                                    <p-select inputId="pf-creci-uf" formControlName="creciUf" [options]="ufs" placeholder="UF" [showClear]="true" appendTo="body" />
                                </div>
                                <div class="flex flex-col gap-2 sm:col-span-2">
                                    <label for="pf-desde">Atua desde</label>
                                    <p-inputnumber inputId="pf-desde" formControlName="atuandoDesde" [useGrouping]="false" [min]="1950" [max]="anoAtual" placeholder="Ano" />
                                    @if (anosExperiencia(); as a) {
                                        <small class="text-muted-color">{{ a }} {{ a === 1 ? 'ano' : 'anos' }} de mercado</small>
                                    }
                                </div>
                                <div class="flex flex-col gap-2 sm:col-span-6">
                                    <label for="pf-regioes">Regiões de atuação</label>
                                    <input pInputText id="pf-regioes" formControlName="regioesAtuacao" placeholder="Ex.: Asa Sul, Águas Claras, Lago Sul" aria-describedby="pf-regioes-dica" />
                                    <small id="pf-regioes-dica" class="text-muted-color">Separe por vírgula.</small>
                                    @if (regioes().length) {
                                        <ul class="list-none p-0 m-0 flex flex-wrap gap-2" aria-label="Regiões informadas">
                                            @for (r of regioes(); track r) {
                                                <li class="perfil__chip">{{ r }}</li>
                                            }
                                        </ul>
                                    }
                                </div>
                                <div class="flex flex-col gap-2 sm:col-span-6">
                                    <label for="pf-sobre">Sobre {{ imobiliaria() ? 'a imobiliária' : 'você' }}</label>
                                    <textarea pTextarea id="pf-sobre" formControlName="sobre" rows="5" [maxlength]="maxSobre" placeholder="Conte sua experiência, especialidades e como você trabalha" aria-describedby="pf-sobre-cont"></textarea>
                                    <small id="pf-sobre-cont" class="text-muted-color text-right">{{ (dados.controls.sobre.value || '').length }} / {{ maxSobre }}</small>
                                </div>
                            </div>

                            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-color mt-5 mb-3">Na internet</h3>
                            <div class="grid gap-4 sm:grid-cols-2">
                                <div class="flex flex-col gap-2 sm:col-span-2">
                                    <label for="pf-site">Site</label>
                                    <p-inputgroup>
                                        <p-inputgroup-addon><i class="pi pi-globe" aria-hidden="true"></i></p-inputgroup-addon>
                                        <input pInputText id="pf-site" type="url" formControlName="site" placeholder="https://www.seusite.com.br" [attr.aria-invalid]="invalido('site')" aria-describedby="pf-site-erro" />
                                    </p-inputgroup>
                                    @if (invalido('site')) {
                                        <small id="pf-site-erro" class="text-red-600">Comece com http:// ou https://</small>
                                    }
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label for="pf-insta">Instagram</label>
                                    <p-inputgroup>
                                        <p-inputgroup-addon>&#64;</p-inputgroup-addon>
                                        <input pInputText id="pf-insta" formControlName="instagram" placeholder="seuusuario" />
                                    </p-inputgroup>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label for="pf-face">Facebook</label>
                                    <p-inputgroup>
                                        <p-inputgroup-addon><i class="pi pi-facebook" aria-hidden="true"></i></p-inputgroup-addon>
                                        <input pInputText id="pf-face" formControlName="facebook" placeholder="facebook.com/suapagina" />
                                    </p-inputgroup>
                                </div>
                            </div>
                        </section>
                    }

                    <!-- endereço -->
                    <section class="card !mb-0" aria-labelledby="sec-end">
                        <h2 id="sec-end" class="perfil__titulo"><i class="pi pi-map-marker" aria-hidden="true"></i>{{ anunciante() ? 'Endereço comercial' : 'Endereço' }}</h2>
                        <div class="grid gap-4 sm:grid-cols-6">
                            <div class="flex flex-col gap-2 sm:col-span-2">
                                <label for="pf-cep">CEP</label>
                                <p-inputmask inputId="pf-cep" formControlName="cep" mask="99.999-999" [unmask]="true" [autoClear]="false" placeholder="00.000-000" autocomplete="postal-code" inputmode="numeric" />
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-4">
                                <label for="pf-logr">Logradouro</label>
                                <input pInputText id="pf-logr" formControlName="logradouro" autocomplete="address-line1" placeholder="Rua, quadra, conjunto…" />
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-2">
                                <label for="pf-num">Número</label>
                                <input pInputText id="pf-num" formControlName="numero" />
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-4">
                                <label for="pf-compl">Complemento</label>
                                <input pInputText id="pf-compl" formControlName="complemento" autocomplete="address-line2" placeholder="Sala, bloco, loja…" />
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-2">
                                <label for="pf-bairro">Bairro</label>
                                <input pInputText id="pf-bairro" formControlName="bairro" />
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-3">
                                <label for="pf-cidade">Cidade</label>
                                <input pInputText id="pf-cidade" formControlName="cidade" autocomplete="address-level2" />
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-1">
                                <label for="pf-uf">UF</label>
                                <p-select inputId="pf-uf" formControlName="uf" [options]="ufs" placeholder="UF" [showClear]="true" appendTo="body" />
                            </div>
                        </div>
                    </section>

                    <div class="perfil__acoes">
                        <span class="text-sm text-muted-color">{{ dados.dirty ? 'Há alterações não salvas.' : 'Tudo salvo.' }}</span>
                        <div class="flex gap-2">
                            <p-button label="Descartar" severity="secondary" [text]="true" [disabled]="!dados.dirty || salvando()" (onClick)="descartar()" />
                            <p-button type="submit" label="Salvar alterações" icon="pi pi-check" [loading]="salvando()" [disabled]="!dados.dirty" />
                        </div>
                    </div>
                </form>

                <!-- senha -->
                <form class="card !mb-0" [formGroup]="senha" (ngSubmit)="trocarSenha()" aria-labelledby="sec-senha">
                    <h2 id="sec-senha" class="perfil__titulo"><i class="pi pi-lock" aria-hidden="true"></i>Segurança</h2>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label for="pf-atual">Senha atual</label>
                            <p-password inputId="pf-atual" formControlName="atual" [feedback]="false" [toggleMask]="true" [fluid]="true" autocomplete="current-password" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="pf-nova">Nova senha (mínimo 8 caracteres)</label>
                            <p-password inputId="pf-nova" formControlName="nova" [toggleMask]="true" [fluid]="true" autocomplete="new-password" />
                        </div>
                    </div>
                    <div class="flex justify-end mt-4"><p-button type="submit" label="Trocar senha" severity="secondary" [outlined]="true" icon="pi pi-key" [loading]="trocando()" /></div>
                </form>
            </div>
        </div>
    `,
    styles: `
        .perfil {
            display: grid;
            gap: 1.5rem;
            align-items: start;
        }
        @media (min-width: 992px) {
            .perfil {
                grid-template-columns: 19rem minmax(0, 1fr);
            }
            .perfil__lado {
                position: sticky;
                top: 6rem;
            }
        }
        .perfil__lado,
        .perfil__principal {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            min-width: 0;
        }
        .perfil__titulo {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 1.25rem;
        }
        .perfil__titulo i {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2rem;
            height: 2rem;
            border-radius: 8px;
            font-size: 0.95rem;
            color: var(--p-primary-color);
            background: color-mix(in srgb, var(--p-primary-color), transparent 88%);
        }
        .perfil__barra {
            height: 0.5rem;
            border-radius: 999px;
            overflow: hidden;
            background: var(--p-surface-200);
        }
        :host-context(.app-dark) .perfil__barra {
            background: var(--p-surface-700);
        }
        .perfil__barra span {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: var(--p-primary-color);
            transition: width 0.3s;
        }
        .perfil__chip {
            font-size: 0.8rem;
            padding: 0.2rem 0.6rem;
            border-radius: 999px;
            background: color-mix(in srgb, var(--p-primary-color), transparent 88%);
            color: var(--p-primary-color);
        }
        .perfil__link {
            align-self: flex-start;
            padding: 0;
            border: 0;
            background: none;
            font-size: 0.85rem;
            color: var(--p-primary-color);
            cursor: pointer;
        }
        .perfil__link:hover {
            text-decoration: underline;
        }
        .perfil__acoes {
            position: sticky;
            bottom: 0;
            z-index: 2;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border: 1px solid var(--p-content-border-color);
            border-radius: var(--p-content-border-radius, 12px);
            background: var(--p-content-background);
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
        }
        @media (prefers-reduced-motion: reduce) {
            .perfil__barra span {
                transition: none;
            }
        }
    `
})
export class PerfilPage {
    readonly recorteFoto = RECORTES.fotoPerfil;
    private conta = inject(ContaService);
    private auth = inject(AuthService);
    private msg = inject(MessageService);
    private fb = inject(NonNullableFormBuilder);

    readonly ufs = UFS;
    readonly anoAtual = ANO_ATUAL;
    readonly maxSobre = MAX_SOBRE;

    usuario = signal<Usuario | null>(null);
    salvando = signal(false);
    trocando = signal(false);

    anunciante = computed(() => !!this.usuario()?.papeis.includes('CORRETOR'));
    imobiliaria = computed(() => this.anunciante() && this.usuario()?.tipoAnunciante === 'IMOBILIARIA');
    tipoRotulo = computed(() => (this.imobiliaria() ? 'Imobiliária' : this.anunciante() ? 'Corretor' : 'Cliente'));

    dados = this.fb.group({
        nome: ['', [Validators.required, Validators.maxLength(120)]],
        razaoSocial: [''],
        telefone: this.fb.control<string | null>(null),
        whatsapp: this.fb.control<string | null>(null),
        emailContato: ['', Validators.email],
        fotoUrl: this.fb.control<string | null>(null),
        creci: [''],
        creciUf: this.fb.control<string | null>(null),
        atuandoDesde: this.fb.control<number | null>(null),
        regioesAtuacao: [''],
        sobre: ['', Validators.maxLength(MAX_SOBRE)],
        site: ['', Validators.pattern(/^$|^https?:\/\/\S+$/i)],
        instagram: [''],
        facebook: [''],
        cep: [''],
        logradouro: [''],
        numero: [''],
        complemento: [''],
        bairro: [''],
        cidade: [''],
        uf: this.fb.control<string | null>(null)
    });

    senha = this.fb.group({
        atual: ['', Validators.required],
        nova: ['', [Validators.required, Validators.minLength(8)]]
    });

    private valores = toSignal(this.dados.valueChanges.pipe(startWith(null)));
    nome = computed(() => (this.valores(), this.dados.controls.nome.value.trim()));
    iniciais = computed(() => (this.nome() ? iniciaisDe(this.nome()) : null));
    regioes = computed(() => (this.valores(), separarRegioes(this.dados.controls.regioesAtuacao.value)));
    anosExperiencia = computed(() => {
        this.valores();
        const a = this.dados.controls.atuandoDesde.value;
        return a && a <= ANO_ATUAL ? Math.max(ANO_ATUAL - a, 0) || null : null;
    });

    /** O que ainda falta para o perfil ficar completo (o que os clientes mais olham). */
    completude = computed(() => {
        this.valores();
        const v = this.dados.getRawValue();
        const itens: [string, unknown][] = [
            ['Foto ou logo', v.fotoUrl],
            ['Nome', v.nome.trim()],
            ['Telefone', v.telefone],
            ['WhatsApp', v.whatsapp],
            ['Cidade e UF', v.cidade.trim() && v.uf]
        ];
        if (this.anunciante()) {
            itens.push(['CRECI', v.creci.trim() && v.creciUf], ['Regiões de atuação', v.regioesAtuacao.trim()], ['Apresentação ("Sobre")', v.sobre.trim()], ['Ano em que começou a atuar', v.atuandoDesde]);
            if (this.imobiliaria()) itens.push(['Razão social', v.razaoSocial.trim()]);
        }
        const faltando = itens.filter(([, ok]) => !ok).map(([n]) => n);
        return { pct: Math.round(((itens.length - faltando.length) / itens.length) * 100), faltando };
    });

    constructor() {
        inject(ConfigService).definirTitulo('Meus dados');
        this.conta.perfil().subscribe({
            next: (u) => this.preencher(u),
            error: (e) => this.msg.add({ severity: 'error', summary: 'Meus dados', detail: mensagemErro(e) })
        });
    }

    invalido(campo: keyof typeof this.dados.controls) {
        const c = this.dados.controls[campo];
        return c.invalid && (c.touched || c.dirty);
    }

    /** A foto é salva junto com o resto; marca o formulário como alterado. */
    mudarFoto(url: string | null) {
        this.dados.controls.fotoUrl.setValue(url);
        this.dados.markAsDirty();
    }

    descartar() {
        const u = this.usuario();
        if (u) this.preencher(u);
    }

    salvar() {
        if (this.dados.invalid) {
            this.dados.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Confira os campos destacados' });
            return;
        }
        const v = this.dados.getRawValue();
        const t = (s: string) => s.trim() || null;
        const form: PerfilForm = {
            nome: v.nome.trim(),
            razaoSocial: t(v.razaoSocial),
            telefone: v.telefone || null,
            whatsapp: v.whatsapp || null,
            emailContato: t(v.emailContato),
            fotoUrl: v.fotoUrl,
            creci: t(v.creci),
            creciUf: v.creciUf || null,
            atuandoDesde: v.atuandoDesde,
            regioesAtuacao: separarRegioes(v.regioesAtuacao).join(', ') || null,
            sobre: t(v.sobre),
            site: t(v.site),
            instagram: t(v.instagram),
            facebook: t(v.facebook),
            cep: t(v.cep.replace(/\D/g, '')),
            logradouro: t(v.logradouro),
            numero: t(v.numero),
            complemento: t(v.complemento),
            bairro: t(v.bairro),
            cidade: t(v.cidade),
            uf: v.uf || null
        };
        this.salvando.set(true);
        this.conta.salvarPerfil(form).subscribe({
            next: (u) => {
                this.salvando.set(false);
                this.preencher(u);
                this.auth.recarregar().subscribe();
                this.msg.add({ severity: 'success', summary: 'Dados salvos' });
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }

    trocarSenha() {
        if (this.senha.invalid) {
            this.senha.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Senha', detail: 'Informe a senha atual e uma nova com pelo menos 8 caracteres.' });
            return;
        }
        const v = this.senha.getRawValue();
        this.trocando.set(true);
        this.conta.trocarSenha(v.atual, v.nova).subscribe({
            next: () => {
                this.trocando.set(false);
                this.senha.reset();
                this.msg.add({ severity: 'success', summary: 'Senha alterada' });
            },
            error: (e) => {
                this.trocando.set(false);
                this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(e) });
            }
        });
    }

    private preencher(u: Usuario) {
        this.usuario.set(u);
        this.dados.reset({
            nome: u.nome,
            razaoSocial: u.razaoSocial ?? '',
            telefone: u.telefone,
            whatsapp: u.whatsapp ?? null,
            emailContato: u.emailContato ?? '',
            fotoUrl: u.fotoUrl,
            creci: u.creci ?? '',
            creciUf: u.creciUf ?? null,
            atuandoDesde: u.atuandoDesde ?? null,
            regioesAtuacao: u.regioesAtuacao ?? '',
            sobre: u.sobre ?? '',
            site: u.site ?? '',
            instagram: u.instagram ?? '',
            facebook: u.facebook ?? '',
            cep: (u.cep ?? '').replace(/\D/g, ''),
            logradouro: u.logradouro ?? '',
            numero: u.numero ?? '',
            complemento: u.complemento ?? '',
            bairro: u.bairro ?? '',
            cidade: u.cidade ?? '',
            uf: u.uf ?? null
        });
    }
}

function separarRegioes(v: string): string[] {
    return [
        ...new Set(
            v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
        )
    ];
}
