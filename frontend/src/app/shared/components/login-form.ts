import { Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@/app/core/services/auth.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { Perfil, Sessao } from '@/app/core/models/models';

/**
 * Login por e-mail e senha.
 *  - área "conta": a pessoa escolhe entrar como Cliente ou Corretor (mesma tela);
 *  - área "admin": entra sempre como Administrador.
 */
@Component({
    selector: 'app-login-form',
    imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, SelectButtonModule, MessageModule],
    template: `
        <form [formGroup]="form" (ngSubmit)="entrar()" class="flex flex-col gap-4" novalidate>
            @if (area() === 'conta') {
                <div class="flex flex-col gap-2">
                    <span id="lg-perfil" class="font-medium">Entrar como</span>
                    <p-selectbutton formControlName="perfil" [options]="perfis" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="lg-perfil" styleClass="w-full" />
                </div>
            }
            <div class="flex flex-col gap-2">
                <label for="lg-email" class="font-medium">E-mail</label>
                <input pInputText id="lg-email" type="email" formControlName="email" autocomplete="username" placeholder="seu@email.com" class="w-full" />
            </div>
            <div class="flex flex-col gap-2">
                <label for="lg-senha" class="font-medium">Senha</label>
                <p-password inputId="lg-senha" formControlName="senha" [feedback]="false" [toggleMask]="true" [fluid]="true" autocomplete="current-password" placeholder="Sua senha" />
            </div>
            @if (erro()) {
                <p-message severity="error" [text]="erro()!" />
            }
            <p-button type="submit" [label]="area() === 'admin' ? 'Entrar na administração' : 'Entrar'" icon="pi pi-sign-in" [loading]="enviando()" styleClass="w-full" />
        </form>
    `
})
export class LoginForm {
    private auth = inject(AuthService);
    private fb = inject(NonNullableFormBuilder);

    area = input<'conta' | 'admin'>('conta');
    entrou = output<Sessao>();

    perfis: { label: string; value: Perfil }[] = [
        { label: 'Cliente', value: 'CLIENTE' },
        { label: 'Corretor', value: 'CORRETOR' }
    ];

    form = this.fb.group({
        perfil: this.fb.control<Perfil>('CLIENTE'),
        email: ['', [Validators.required, Validators.email]],
        senha: ['', Validators.required]
    });

    enviando = signal(false);
    erro = signal<string | null>(null);

    entrar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.erro.set('Informe um e-mail válido e a senha.');
            return;
        }
        const v = this.form.getRawValue();
        this.erro.set(null);
        this.enviando.set(true);
        this.auth.login({ email: v.email, senha: v.senha, perfil: this.area() === 'admin' ? 'ADMIN' : v.perfil, area: this.area() }).subscribe({
            next: (s) => {
                this.enviando.set(false);
                this.entrou.emit(s);
            },
            error: (e) => {
                this.enviando.set(false);
                this.erro.set(mensagemErro(e, 'Não foi possível entrar.'));
            }
        });
    }
}
