import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormsModule, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DocumentoConteudo } from './documento-conteudo';
import { DocumentoService } from '@/app/core/services/documento.service';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@/app/core/services/auth.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { DocumentoPublico, Perfil, Sessao } from '@/app/core/models/models';
import { TelefoneInput } from '@/app/shared/components/telefone-input';
import { digitos } from '@/app/core/pipes/formatos';
import { cnpjValido, cpfValido } from '@/app/core/pipes/documentos';

type Campo = 'documento' | 'creci' | 'nome' | 'email' | 'telefone' | 'senha';

/**
 * Cadastro de conta.
 *  - modo "escolha": a pessoa marca se é cliente ou corretor/imobiliária (/conta/cadastro);
 *  - modo "anunciante": só corretor ou imobiliária, com CPF/CNPJ e CRECI (/anunciar).
 *
 * Os dois grupos de radio têm `name` próprio: o PrimeNG agrupa radios do mesmo formulário pelo `name`, e sem ele
 * marcar "Imobiliária" desmarcava visualmente "Anunciar".
 */
@Component({
    selector: 'app-cadastro-form',
    imports: [ReactiveFormsModule, FormsModule, CheckboxModule, DialogModule, DocumentoConteudo, InputTextModule, InputMaskModule, PasswordModule, ButtonModule, RadioButtonModule, MessageModule, TelefoneInput],
    template: `
        <form [formGroup]="form" (ngSubmit)="cadastrar()" class="flex flex-col gap-5" novalidate>
            @if (modo() === 'escolha') {
                <fieldset class="flex flex-col gap-2 border-0 p-0 m-0 min-w-0">
                    <legend class="font-medium mb-2">Quero</legend>
                    <div class="grid gap-3 sm:grid-cols-2">
                        @for (o of opcoesTipo; track o.value) {
                            <label
                                [for]="'cd-tipo-' + o.value"
                                class="flex items-start gap-3 p-3 rounded-border border cursor-pointer transition-colors min-w-0"
                                [class]="tipo() === o.value ? 'border-primary bg-primary-50 dark:bg-primary-400/10' : 'border-surface hover:border-primary-300'"
                            >
                                <p-radiobutton formControlName="tipo" name="cadastro-tipo" [value]="o.value" [inputId]="'cd-tipo-' + o.value" class="mt-0.5" />
                                <span class="min-w-0">
                                    <span class="block font-medium">{{ o.label }}</span>
                                    <span class="block text-xs text-muted-color">{{ o.dica }}</span>
                                </span>
                            </label>
                        }
                    </div>
                </fieldset>
            }
            @if (anunciante()) {
                <fieldset class="flex flex-col gap-2 border-0 p-0 m-0 min-w-0">
                    <legend class="font-medium mb-2">Você é <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span></legend>
                    <div class="flex flex-wrap gap-6">
                        <label for="cd-pf" class="flex items-center gap-2 cursor-pointer"><p-radiobutton formControlName="tipoAnunciante" name="cadastro-tipo-anunciante" value="CORRETOR" inputId="cd-pf" /> Corretor</label>
                        <label for="cd-pj" class="flex items-center gap-2 cursor-pointer"><p-radiobutton formControlName="tipoAnunciante" name="cadastro-tipo-anunciante" value="IMOBILIARIA" inputId="cd-pj" /> Imobiliária</label>
                    </div>
                </fieldset>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2 min-w-0">
                        <label for="cd-doc" class="font-medium">{{ ehImobiliaria() ? 'CNPJ' : 'CPF' }} <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span></label>
                        <!-- trocar Corretor/Imobiliária troca a máscara e limpa o campo (CPF e CNPJ têm tamanhos diferentes) -->
                        <p-inputmask
                            inputId="cd-doc"
                            formControlName="documento"
                            [mask]="ehImobiliaria() ? '99.999.999/9999-99' : '999.999.999-99'"
                            [unmask]="true"
                            [autoClear]="false"
                            inputmode="numeric"
                            [fluid]="true"
                            [invalid]="invalido('documento')"
                            [ariaRequired]="true"
                            [placeholder]="ehImobiliaria() ? '12.345.678/0001-90' : '123.456.789-09'"
                            [attr.aria-describedby]="invalido('documento') ? 'cd-doc-erro' : null"
                        />
                        @if (invalido('documento')) {
                            <small id="cd-doc-erro" class="text-red-600 dark:text-red-400">{{ erroCampo('documento') }}</small>
                        }
                    </div>
                    <div class="flex flex-col gap-2 min-w-0">
                        <label for="cd-creci" class="font-medium">CRECI <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span></label>
                        <input pInputText id="cd-creci" formControlName="creci" placeholder="Ex.: 12345-F" maxlength="30" class="w-full" aria-required="true" [attr.aria-invalid]="invalido('creci')" [attr.aria-describedby]="invalido('creci') ? 'cd-creci-erro' : null" />
                        @if (invalido('creci')) {
                            <small id="cd-creci-erro" class="text-red-600 dark:text-red-400">{{ erroCampo('creci') }}</small>
                        }
                    </div>
                </div>
            }
            <div class="flex flex-col gap-2 min-w-0">
                <label for="cd-nome" class="font-medium">{{ ehImobiliaria() ? 'Nome da imobiliária' : 'Nome' }} <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span></label>
                <input pInputText id="cd-nome" formControlName="nome" [autocomplete]="ehImobiliaria() ? 'organization' : 'name'" maxlength="120" class="w-full" aria-required="true" [attr.aria-invalid]="invalido('nome')" [attr.aria-describedby]="invalido('nome') ? 'cd-nome-erro' : null" />
                @if (invalido('nome')) {
                    <small id="cd-nome-erro" class="text-red-600 dark:text-red-400">{{ erroCampo('nome') }}</small>
                }
            </div>
            <div class="flex flex-col gap-2 min-w-0">
                <label for="cd-email" class="font-medium">E-mail <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span></label>
                <input pInputText id="cd-email" type="email" formControlName="email" autocomplete="email" class="w-full" aria-required="true" [attr.aria-invalid]="invalido('email')" [attr.aria-describedby]="invalido('email') ? 'cd-email-erro' : null" />
                @if (invalido('email')) {
                    <small id="cd-email-erro" class="text-red-600 dark:text-red-400">{{ erroCampo('email') }}</small>
                }
            </div>
            <div class="flex flex-col gap-2 min-w-0">
                <label for="cd-tel" class="font-medium">
                    Celular
                    @if (anunciante()) {
                        <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span>
                    } @else {
                        <span class="text-muted-color font-normal">(opcional)</span>
                    }
                </label>
                <app-telefone-input inputId="cd-tel" formControlName="telefone" />
                @if (invalido('telefone')) {
                    <small class="text-red-600 dark:text-red-400">{{ erroCampo('telefone') }}</small>
                }
            </div>
            <div class="flex flex-col gap-2 min-w-0">
                <label for="cd-senha" class="font-medium">Senha <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span></label>
                <p-password inputId="cd-senha" formControlName="senha" [toggleMask]="true" [fluid]="true" autocomplete="new-password" [invalid]="invalido('senha')" />
                <small [class]="invalido('senha') ? 'text-red-600 dark:text-red-400' : 'text-muted-color'">{{ invalido('senha') ? erroCampo('senha') : 'Mínimo de 8 caracteres.' }}</small>
            </div>
            @if (documentos().length) {
                <fieldset class="flex flex-col gap-2 border-0 p-0 m-0 min-w-0" aria-describedby="cd-docs-dica">
                    <legend class="sr-only">Documentos para aceitar</legend>
                    @for (d of documentos(); track d.id) {
                        <div class="flex items-start gap-3 p-3 rounded-border border" [class]="aceitos().has(d.id) ? 'border-primary bg-primary-50 dark:bg-primary-400/10' : faltaAceite(d.id) ? 'border-red-400' : 'border-surface'">
                            <p-checkbox [inputId]="'cd-doc-aceite-' + d.id" [binary]="true" [ngModel]="aceitos().has(d.id)" (ngModelChange)="marcar(d.id, $event)" [ngModelOptions]="{ standalone: true }" [invalid]="faltaAceite(d.id)" class="mt-0.5" />
                            <label [for]="'cd-doc-aceite-' + d.id" class="text-sm cursor-pointer min-w-0">
                                Li e aceito {{ artigo(d.tipo) }}
                                <button type="button" class="p-0 border-0 bg-transparent text-primary font-semibold hover:underline cursor-pointer text-left" (click)="$event.preventDefault(); $event.stopPropagation(); lendo.set(d)" aria-haspopup="dialog">{{ d.titulo }}</button>
                                <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span>
                                @if (d.resumo) {
                                    <span class="block text-xs text-muted-color mt-0.5">{{ d.resumo }}</span>
                                }
                            </label>
                        </div>
                    }
                    <small id="cd-docs-dica" [class]="faltaAlgumAceite() ? 'text-red-600 dark:text-red-400' : 'text-muted-color'">
                        {{ faltaAlgumAceite() ? 'Para criar a conta, marque que leu e aceita os documentos acima.' : 'Clique no nome do documento para ler.' }}
                    </small>
                </fieldset>
            }
            <p class="text-sm text-muted-color m-0"><span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span> Campos obrigatórios.</p>
            @if (erro()) {
                <p-message severity="error" [text]="erro()!" role="alert" />
            }
            <p-button type="submit" [label]="anunciante() ? 'Cadastrar como anunciante' : 'Criar conta'" icon="pi pi-check" [loading]="enviando()" styleClass="w-full" />
        </form>

        <p-dialog
            [visible]="!!lendo()"
            (visibleChange)="!$event && lendo.set(null)"
            [modal]="true"
            [dismissableMask]="true"
            [draggable]="false"
            [header]="lendo()?.titulo ?? ''"
            [style]="{ width: '52rem' }"
            [breakpoints]="{ '768px': '96vw' }"
            [contentStyle]="{ 'max-height': '65vh' }"
        >
            @if (lendo(); as d) {
                <p class="text-sm text-muted-color mt-0 mb-4">Versão {{ d.versao }}{{ d.resumo ? ' · ' + d.resumo : '' }}</p>
                <app-documento-conteudo [html]="d.conteudo" />
            }
            <ng-template #footer>
                <div class="flex flex-wrap items-center justify-between gap-2 w-full">
                    <a [href]="'/documentos/' + (lendo()?.slug ?? '')" target="_blank" rel="noopener" class="text-sm text-muted-color hover:text-primary hover:underline">Abrir em nova aba</a>
                    <div class="flex gap-2">
                        <p-button label="Fechar" severity="secondary" [text]="true" (onClick)="lendo.set(null)" />
                        <p-button label="Li e aceito" icon="pi pi-check" (onClick)="aceitarLido()" />
                    </div>
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class CadastroForm {
    private auth = inject(AuthService);
    private fb = inject(NonNullableFormBuilder);

    modo = input<'escolha' | 'anunciante'>('escolha');
    cadastrou = output<Sessao>();

    readonly opcoesTipo: { value: Perfil; label: string; dica: string }[] = [
        { value: 'CLIENTE', label: 'Buscar imóveis', dica: 'Salvar favoritos e falar com anunciantes' },
        { value: 'CORRETOR', label: 'Anunciar imóveis', dica: 'Sou corretor ou imobiliária' }
    ];

    form = this.fb.group({
        tipo: this.fb.control<Perfil>('CLIENTE'),
        tipoAnunciante: this.fb.control<'CORRETOR' | 'IMOBILIARIA'>('CORRETOR'),
        documento: [''],
        creci: [''],
        nome: ['', [Validators.required, Validators.maxLength(120)]],
        email: ['', [Validators.required, Validators.email]],
        telefone: [''],
        senha: ['', [Validators.required, Validators.minLength(8)]]
    });

    tipo = toSignal(this.form.controls.tipo.valueChanges, { initialValue: 'CLIENTE' as Perfil });
    private tipoAnunciante = toSignal(this.form.controls.tipoAnunciante.valueChanges, { initialValue: 'CORRETOR' as const });

    anunciante = computed(() => this.modo() === 'anunciante' || this.tipo() === 'CORRETOR');
    ehImobiliaria = computed(() => this.anunciante() && this.tipoAnunciante() === 'IMOBILIARIA');

    enviando = signal(false);
    erro = signal<string | null>(null);
    private tentou = signal(false);

    /** Documentos que precisam ser aceitos para criar a conta (mudam entre cliente e anunciante). */
    documentos = signal<DocumentoPublico[]>([]);
    aceitos = signal(new Set<number>());
    private docsService = inject(DocumentoService);

    faltaAceite(id: number) {
        return this.tentou() && !this.aceitos().has(id);
    }

    faltaAlgumAceite() {
        return this.tentou() && this.documentos().some((d) => !this.aceitos().has(d.id));
    }

    /** Documento aberto na janela de leitura. */
    lendo = signal<DocumentoPublico | null>(null);

    aceitarLido() {
        const d = this.lendo();
        if (d) this.marcar(d.id, true);
        this.lendo.set(null);
        // devolve o foco para a caixa do documento aceito
        if (d) setTimeout(() => document.getElementById('cd-doc-aceite-' + d.id)?.focus());
    }

    marcar(id: number, sim: boolean) {
        this.aceitos.update((s) => {
            const n = new Set(s);
            if (sim) n.add(id);
            else n.delete(id);
            return n;
        });
    }

    artigo(tipo: DocumentoPublico['tipo']) {
        return tipo === 'TERMOS_USO' ? 'os' : tipo === 'CODIGO_CONDUTA' || tipo === 'CONTRATO' ? 'o' : 'a';
    }

    /** CPF (corretor) ou CNPJ (imobiliária) completo e com dígitos verificadores corretos. */
    private validarDocumento = (c: AbstractControl): ValidationErrors | null => {
        const d = digitos(c.value);
        if (!d) return null; // "required" cuida do vazio
        const tamanho = this.ehImobiliaria() ? 14 : 11;
        if (d.length < tamanho) return { incompleto: true };
        return (this.ehImobiliaria() ? cnpjValido(d) : cpfValido(d)) ? null : { documento: true };
    };

    constructor() {
        // documento, CRECI e celular só são obrigatórios para anunciante
        effect(() => {
            const anunciante = this.anunciante();
            const c = this.form.controls;
            c.documento.setValidators(anunciante ? [Validators.required, this.validarDocumento] : []);
            c.creci.setValidators(anunciante ? [Validators.required, Validators.maxLength(30)] : []);
            c.telefone.setValidators(anunciante ? [Validators.required] : []);
            [c.documento, c.creci, c.telefone].forEach((x) => x.updateValueAndValidity({ emitEvent: false }));
        });
        // documentos exigidos no cadastro conforme o perfil (cliente x anunciante)
        effect((onCleanup) => {
            const perfil: Perfil = this.anunciante() ? 'CORRETOR' : 'CLIENTE';
            const sub = this.docsService.exigidosNoCadastro(perfil).subscribe({
                next: (l) => {
                    this.documentos.set(l);
                    this.aceitos.update((s) => new Set([...s].filter((id) => l.some((d) => d.id === id))));
                },
                error: () => this.documentos.set([])
            });
            onCleanup(() => sub.unsubscribe());
        });
        // CPF e CNPJ têm máscaras de tamanhos diferentes: ao trocar, começa do zero
        this.form.controls.tipoAnunciante.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
            this.form.controls.documento.reset('');
        });
    }

    /** Mostra o erro do campo depois de tocado ou de uma tentativa de envio. */
    invalido(campo: Campo): boolean {
        const c = this.form.controls[campo];
        return c.invalid && (c.touched || this.tentou());
    }

    erroCampo(campo: Campo): string {
        const e = this.form.controls[campo].errors ?? {};
        if (e['required']) {
            return { documento: this.ehImobiliaria() ? 'Informe o CNPJ.' : 'Informe o CPF.', creci: 'Informe o CRECI.', nome: 'Informe o nome.', email: 'Informe o e-mail.', telefone: 'Informe o celular.', senha: 'Crie uma senha.' }[campo];
        }
        if (e['incompleto']) return this.ehImobiliaria() ? 'CNPJ incompleto.' : 'CPF incompleto.';
        if (e['documento']) return this.ehImobiliaria() ? 'CNPJ inválido. Confira os números.' : 'CPF inválido. Confira os números.';
        if (e['email']) return 'E-mail inválido.';
        if (e['telefone']) return 'Número incompleto: informe DDD e número.';
        if (e['minlength']) return 'A senha precisa ter pelo menos 8 caracteres.';
        if (e['maxlength']) return 'Texto longo demais.';
        return 'Campo inválido.';
    }

    cadastrar() {
        this.tentou.set(true);
        if (this.form.invalid || this.documentos().some((d) => !this.aceitos().has(d.id))) {
            this.form.markAllAsTouched();
            this.erro.set('Confira os campos destacados.');
            const pendente = this.documentos().find((d) => !this.aceitos().has(d.id));
            const campo = document.querySelector<HTMLElement>('app-cadastro-form .ng-invalid input, app-cadastro-form input.ng-invalid');
            (campo ?? (pendente ? document.getElementById('cd-doc-aceite-' + pendente.id) : null))?.focus();
            return;
        }
        const v = this.form.getRawValue();
        const anunciante = this.anunciante();
        this.erro.set(null);
        this.enviando.set(true);
        this.auth
            .registrar({
                nome: v.nome.trim(),
                email: v.email.trim(),
                senha: v.senha,
                telefone: v.telefone || null,
                tipo: anunciante ? 'CORRETOR' : 'CLIENTE',
                creci: anunciante ? v.creci.trim() : null,
                documento: anunciante ? digitos(v.documento) : null,
                tipoAnunciante: anunciante ? v.tipoAnunciante : null,
                aceites: this.documentos().map((d) => ({ documentoId: d.id, versao: d.versao }))
            })
            .subscribe({
                next: (s) => {
                    this.enviando.set(false);
                    this.cadastrou.emit(s);
                },
                error: (e) => {
                    this.enviando.set(false);
                    this.erro.set(mensagemErro(e, 'Não foi possível criar a conta.'));
                }
            });
    }
}
