import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { InputMaskModule } from 'primeng/inputmask';
import { MessageService } from 'primeng/api';
import { ContaService } from '@/app/core/services/conta.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { ImageUpload } from '@/app/shared/components/image-upload';

/** Meus dados e troca de senha (qualquer perfil). */
@Component({
    selector: 'app-perfil-page',
    imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, InputMaskModule, PageHeader, ImageUpload],
    template: `
        <app-page-header titulo="Meus dados" [subtitulo]="email()" />
        <div class="grid grid-cols-12 gap-6">
            <form class="card col-span-12 lg:col-span-7 flex flex-col gap-4" [formGroup]="dados" (ngSubmit)="salvar()">
                <h2 class="text-lg font-semibold m-0">Perfil</h2>
                <div class="flex flex-col gap-2">
                    <label for="pf-nome">Nome</label>
                    <input pInputText id="pf-nome" formControlName="nome" autocomplete="name" />
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2">
                        <label for="pf-tel">Telefone</label>
                        <p-inputmask inputId="pf-tel" formControlName="telefone" mask="(99) 99999-9999" [autoClear]="false" styleClass="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="pf-creci">CRECI (corretores)</label>
                        <input pInputText id="pf-creci" formControlName="creci" />
                    </div>
                </div>
                <app-image-upload rotulo="Foto ou logo" [url]="dados.controls.fotoUrl.value" (urlChange)="dados.controls.fotoUrl.setValue($event)" />
                <div class="flex justify-end"><p-button type="submit" label="Salvar" icon="pi pi-check" [loading]="salvando()" /></div>
            </form>

            <form class="card col-span-12 lg:col-span-5 flex flex-col gap-4" [formGroup]="senha" (ngSubmit)="trocarSenha()">
                <h2 class="text-lg font-semibold m-0">Trocar senha</h2>
                <div class="flex flex-col gap-2">
                    <label for="pf-atual">Senha atual</label>
                    <p-password inputId="pf-atual" formControlName="atual" [feedback]="false" [toggleMask]="true" [fluid]="true" autocomplete="current-password" />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="pf-nova">Nova senha (mínimo 8 caracteres)</label>
                    <p-password inputId="pf-nova" formControlName="nova" [toggleMask]="true" [fluid]="true" autocomplete="new-password" />
                </div>
                <div class="flex justify-end"><p-button type="submit" label="Trocar senha" severity="secondary" [loading]="trocando()" /></div>
            </form>
        </div>
    `
})
export class PerfilPage {
    private conta = inject(ContaService);
    private auth = inject(AuthService);
    private msg = inject(MessageService);
    private fb = inject(NonNullableFormBuilder);

    email = signal(this.auth.usuario()?.email ?? '');
    salvando = signal(false);
    trocando = signal(false);

    dados = this.fb.group({
        nome: ['', [Validators.required, Validators.maxLength(120)]],
        telefone: [''],
        creci: [''],
        fotoUrl: this.fb.control<string | null>(null)
    });

    senha = this.fb.group({
        atual: ['', Validators.required],
        nova: ['', [Validators.required, Validators.minLength(8)]]
    });

    constructor() {
        inject(ConfigService).definirTitulo('Meus dados');
        this.conta.perfil().subscribe((u) => this.dados.setValue({ nome: u.nome, telefone: u.telefone ?? '', creci: u.creci ?? '', fotoUrl: u.fotoUrl }));
    }

    salvar() {
        if (this.dados.invalid) {
            this.dados.markAllAsTouched();
            return;
        }
        const v = this.dados.getRawValue();
        this.salvando.set(true);
        this.conta.salvarPerfil({ nome: v.nome, telefone: v.telefone || null, creci: v.creci || null, fotoUrl: v.fotoUrl }).subscribe({
            next: () => {
                this.salvando.set(false);
                this.auth.recarregar().subscribe();
                this.msg.add({ severity: 'success', summary: 'Dados salvos' });
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(e) });
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
}
