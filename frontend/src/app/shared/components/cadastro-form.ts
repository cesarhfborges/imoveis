import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputMaskModule } from 'primeng/inputmask';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@/app/core/services/auth.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { Perfil, Sessao } from '@/app/core/models/models';

/**
 * Cadastro de conta.
 *  - modo "escolha": a pessoa marca se é cliente ou corretor/imobiliária (/conta/cadastro);
 *  - modo "anunciante": só corretor ou imobiliária, com CPF/CNPJ e CRECI (/anunciar).
 */
@Component({
    selector: 'app-cadastro-form',
    imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, RadioButtonModule, InputMaskModule, MessageModule],
    template: `
        <form [formGroup]="form" (ngSubmit)="cadastrar()" class="flex flex-col gap-4" novalidate>
            @if (modo() === 'escolha') {
                <fieldset class="flex flex-col gap-2 border-0 p-0 m-0">
                    <legend class="font-medium mb-2">Quero</legend>
                    <div class="flex flex-wrap gap-6">
                        <label class="flex items-center gap-2 cursor-pointer"><p-radiobutton formControlName="tipo" value="CLIENTE" inputId="cd-cli" /> Buscar imóveis (cliente)</label>
                        <label class="flex items-center gap-2 cursor-pointer"><p-radiobutton formControlName="tipo" value="CORRETOR" inputId="cd-cor" /> Anunciar (corretor/imobiliária)</label>
                    </div>
                </fieldset>
            }
            @if (anunciante()) {
                <fieldset class="flex flex-col gap-2 border-0 p-0 m-0">
                    <legend class="font-medium mb-2">* Você é</legend>
                    <div class="flex flex-wrap gap-6">
                        <label class="flex items-center gap-2 cursor-pointer"><p-radiobutton formControlName="tipoAnunciante" value="CORRETOR" inputId="cd-pf" /> Corretor</label>
                        <label class="flex items-center gap-2 cursor-pointer"><p-radiobutton formControlName="tipoAnunciante" value="IMOBILIARIA" inputId="cd-pj" /> Imobiliária</label>
                    </div>
                </fieldset>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2">
                        <label for="cd-doc" class="font-medium">* {{ ehImobiliaria() ? 'CNPJ' : 'CPF' }}</label>
                        <input pInputText id="cd-doc" formControlName="documento" [placeholder]="ehImobiliaria() ? '00.000.000/0000-00' : '000.000.000-00'" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="cd-creci" class="font-medium">* Creci</label>
                        <input pInputText id="cd-creci" formControlName="creci" placeholder="Creci" />
                    </div>
                </div>
            }
            <div class="flex flex-col gap-2">
                <label for="cd-nome" class="font-medium">* {{ ehImobiliaria() ? 'Nome da imobiliária' : 'Nome' }}</label>
                <input pInputText id="cd-nome" formControlName="nome" autocomplete="name" />
            </div>
            <div class="flex flex-col gap-2">
                <label for="cd-email" class="font-medium">* E-mail</label>
                <input pInputText id="cd-email" type="email" formControlName="email" autocomplete="email" />
            </div>
            <div class="flex flex-col gap-2">
                <label for="cd-tel" class="font-medium">{{ anunciante() ? '* ' : '' }}Celular</label>
                <p-inputmask inputId="cd-tel" formControlName="telefone" mask="(99) 99999-9999" placeholder="(00) 00000-0000" [autoClear]="false" styleClass="w-full" />
            </div>
            <div class="flex flex-col gap-2">
                <label for="cd-senha" class="font-medium">* Senha (mínimo 8 caracteres)</label>
                <p-password inputId="cd-senha" formControlName="senha" [toggleMask]="true" [fluid]="true" autocomplete="new-password" />
            </div>
            <p class="text-sm text-red-600 dark:text-red-400 m-0">Campos com * são obrigatórios.</p>
            @if (erro()) {
                <p-message severity="error" [text]="erro()!" />
            }
            <div class="flex justify-end">
                <p-button type="submit" [label]="anunciante() ? 'Cadastrar' : 'Criar conta'" [loading]="enviando()" />
            </div>
        </form>
    `
})
export class CadastroForm {
    private auth = inject(AuthService);
    private fb = inject(NonNullableFormBuilder);

    modo = input<'escolha' | 'anunciante'>('escolha');
    cadastrou = output<Sessao>();

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

    private tipo = toSignal(this.form.controls.tipo.valueChanges, { initialValue: 'CLIENTE' as Perfil });
    private tipoAnunciante = toSignal(this.form.controls.tipoAnunciante.valueChanges, { initialValue: 'CORRETOR' as const });

    anunciante = computed(() => this.modo() === 'anunciante' || this.tipo() === 'CORRETOR');
    ehImobiliaria = computed(() => this.anunciante() && this.tipoAnunciante() === 'IMOBILIARIA');

    enviando = signal(false);
    erro = signal<string | null>(null);

    cadastrar() {
        const v = this.form.getRawValue();
        const anunciante = this.anunciante();
        if (this.form.invalid || (anunciante && (!v.creci.trim() || !v.documento.trim() || !v.telefone.trim()))) {
            this.form.markAllAsTouched();
            this.erro.set(anunciante ? 'Preencha documento, CRECI, nome, e-mail, celular e senha (mínimo 8 caracteres).' : 'Preencha nome, e-mail válido e senha (mínimo 8 caracteres).');
            return;
        }
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
                documento: anunciante ? v.documento.trim() : null,
                tipoAnunciante: anunciante ? v.tipoAnunciante : null
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
