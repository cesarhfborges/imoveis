import { Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ImovelService } from '@/app/core/services/imovel.service';
import { AuthService } from '@/app/core/services/auth.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { TelefoneInput } from '@/app/shared/components/telefone-input';

/** "Contate o anunciante": envia a mensagem (lead) para o corretor do imóvel. */
@Component({
    selector: 'app-contato-form',
    imports: [ReactiveFormsModule, InputTextModule, TextareaModule, ButtonModule, MessageModule, TelefoneInput],
    template: `
        @if (enviado()) {
            <p-message severity="success" text="Mensagem enviada! O anunciante vai responder pelo seu e-mail ou telefone." />
            <p-button label="Enviar outra" [text]="true" size="small" styleClass="mt-2" (onClick)="enviado.set(false)" />
        } @else {
            <form [formGroup]="form" class="flex flex-col gap-2" (ngSubmit)="enviar()" novalidate>
                <label class="sr-only" for="ct-nome">Nome</label>
                <input pInputText id="ct-nome" formControlName="nome" placeholder="Nome" autocomplete="name" />
                <label class="sr-only" for="ct-email">E-mail</label>
                <input pInputText id="ct-email" type="email" formControlName="email" placeholder="E-mail" autocomplete="email" />
                <label class="sr-only" for="ct-tel">Celular</label>
                <app-telefone-input inputId="ct-tel" formControlName="telefone" placeholder="Celular" />
                <label class="sr-only" for="ct-msg">Mensagem</label>
                <textarea pTextarea id="ct-msg" formControlName="mensagem" rows="4"></textarea>
                @if (erro()) {
                    <p-message severity="error" [text]="erro()!" size="small" />
                }
                <p-button type="submit" label="Enviar mensagem agora" icon="pi pi-envelope" severity="warn" [loading]="enviando()" styleClass="w-full" />
                <p class="text-[0.7rem] text-muted-color text-center m-0">Ao enviar, você concorda em ser contatado pelo anunciante sobre este imóvel.</p>
            </form>
        }
    `
})
export class ContatoForm {
    private imoveis = inject(ImovelService);
    private auth = inject(AuthService);
    private fb = inject(NonNullableFormBuilder);

    imovelId = input.required<number>();
    enviadoOk = output<void>();

    form = this.fb.group({
        nome: [this.auth.usuario()?.nome ?? '', [Validators.required, Validators.maxLength(120)]],
        email: [this.auth.usuario()?.email ?? '', [Validators.required, Validators.email]],
        telefone: [this.auth.usuario()?.telefone ?? ''],
        mensagem: ['Olá! Gostaria de mais informações sobre este imóvel. Aguardo retorno, obrigado(a).', [Validators.required, Validators.maxLength(2000)]]
    });

    enviando = signal(false);
    enviado = signal(false);
    erro = signal<string | null>(null);

    enviar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.erro.set('Preencha nome, um e-mail válido e a mensagem.');
            return;
        }
        const v = this.form.getRawValue();
        this.erro.set(null);
        this.enviando.set(true);
        this.imoveis.contatar(this.imovelId(), { ...v, telefone: v.telefone || null }).subscribe({
            next: () => {
                this.enviando.set(false);
                this.enviado.set(true);
                this.enviadoOk.emit();
            },
            error: (e) => {
                this.enviando.set(false);
                this.erro.set(mensagemErro(e));
            }
        });
    }
}
