import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@/app/core/services/auth.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { Perfil, Sessao } from '@/app/core/models/models';
import { DemoModeService } from '@/app/core/interceptors/demo.interceptor';
import { environment } from '@/environments/environment';

interface ContaDemo {
    rotulo: string;
    descricao: string;
    email: string;
    senha: string;
    perfil: Perfil;
}

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

        @if (mostrarContas()) {
            <section class="mt-6 p-4 rounded-border border border-dashed border-surface bg-surface-50 dark:bg-surface-800" aria-labelledby="demo-titulo">
                <h2 id="demo-titulo" class="text-base font-semibold m-0">{{ demo.ativo() ? 'Contas de demonstração' : 'Usuários de teste (desenvolvimento)' }}</h2>
                <p class="text-sm text-muted-color mt-1 mb-3">
                    {{ demo.ativo() ? 'O site está sem a API, então os dados ficam só neste navegador.' : 'Criados pelo backend no perfil dev (só aparecem fora da produção).' }} Clique numa conta para entrar:
                </p>
                <div class="flex flex-col gap-2">
                    @for (c of contasDemo(); track c.rotulo) {
                        <button type="button" class="flex items-center justify-between gap-3 text-left p-2 rounded-border border border-surface bg-surface-0 dark:bg-surface-900 hover:border-primary cursor-pointer" (click)="entrarComo(c)">
                            <span>
                                <strong class="block text-sm">{{ c.rotulo }}</strong>
                                <span class="text-xs text-muted-color">{{ c.email }} · senha {{ c.senha }}</span>
                            </span>
                            <span class="text-xs text-muted-color hidden sm:inline">{{ c.descricao }}</span>
                        </button>
                    }
                </div>
                @if (area() === 'conta') {
                    <p class="text-sm mt-3 mb-0">Painel de administração: <a href="/admin/login" class="text-primary font-semibold hover:underline">/admin/login</a> (admin@imoveis.local / admin12345)</p>
                } @else {
                    <p class="text-sm mt-3 mb-0">Área de cliente e corretor: <a href="/conta/login" class="text-primary font-semibold hover:underline">/conta/login</a></p>
                }
            </section>
        }
    `
})
export class LoginForm {
    private auth = inject(AuthService);
    private fb = inject(NonNullableFormBuilder);
    demo = inject(DemoModeService);
    /** Mostra os usuários de teste no modo demonstração ou em build de desenvolvimento (nunca em produção com API). */
    mostrarContas = computed(() => this.demo.ativo() || !environment.production);

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

    /** Contas criadas pelo modo demonstração (as mesmas que o backend cria em dev). */
    contasDemo(): ContaDemo[] {
        if (this.area() === 'admin') {
            return [{ rotulo: 'Administrador', descricao: 'painel /admin', email: 'admin@imoveis.local', senha: 'admin12345', perfil: 'ADMIN' }];
        }
        return [
            { rotulo: 'Cliente', descricao: 'favoritos', email: 'cliente@imoveis.local', senha: 'cliente123', perfil: 'CLIENTE' },
            { rotulo: 'Corretor', descricao: 'meus anúncios', email: 'corretor@imoveis.local', senha: 'corretor123', perfil: 'CORRETOR' },
            { rotulo: 'Imobiliária', descricao: 'outro anunciante', email: 'imobiliaria@imoveis.local', senha: 'corretor123', perfil: 'CORRETOR' },
            { rotulo: 'Corretor entrando como cliente', descricao: 'mesma conta, outro perfil', email: 'corretor@imoveis.local', senha: 'corretor123', perfil: 'CLIENTE' },
            { rotulo: 'Administrador entrando como corretor', descricao: 'admin também é corretor', email: 'admin@imoveis.local', senha: 'admin12345', perfil: 'CORRETOR' }
        ];
    }

    entrarComo(c: ContaDemo) {
        this.form.setValue({ perfil: c.perfil, email: c.email, senha: c.senha });
        this.entrar();
    }

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
