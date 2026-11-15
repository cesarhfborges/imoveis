import { Component, computed, inject, input, model, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { TipoDenunciaPublico } from '@/app/core/models/models';
import { ModeracaoService } from '@/app/core/services/moderacao.service';
import { AuthService } from '@/app/core/services/auth.service';
import { mensagemErro } from '@/app/core/services/api.service';

/** Modal "Denunciar anúncio" (só para quem está logado). */
@Component({
    selector: 'app-denunciar-dialog',
    imports: [DialogModule, ButtonModule, TextareaModule, ReactiveFormsModule],
    template: `
        <p-dialog
            [visible]="visivel()"
            (visibleChange)="visivel.set($event)"
            (onShow)="aoAbrir()"
            [modal]="true"
            [dismissableMask]="true"
            header="Denunciar anúncio"
            [style]="{ width: '36rem' }"
            [breakpoints]="{ '640px': '96vw' }"
            [draggable]="false"
        >
            @if (!auth.logado()) {
                <p class="mt-0">Para denunciar um anúncio é preciso entrar na sua conta. Assim conseguimos avisar você quando a denúncia for analisada.</p>
                <div class="flex justify-end gap-2">
                    <p-button label="Cancelar" [text]="true" severity="secondary" (onClick)="visivel.set(false)" />
                    <p-button label="Entrar" icon="pi pi-sign-in" (onClick)="entrar()" />
                </div>
            } @else if (enviada()) {
                <div class="text-center py-4">
                    <i class="pi pi-check-circle text-4xl text-green-600" aria-hidden="true"></i>
                    <h3 class="text-lg font-semibold mt-3 mb-2">Denúncia enviada</h3>
                    <p class="text-muted-color m-0">Obrigado. O anunciante será avisado para corrigir ou se explicar, e a moderação vai analisar. Você acompanha a situação em <strong>Minhas denúncias</strong>.</p>
                </div>
                <div class="flex justify-end gap-2">
                    <p-button label="Minhas denúncias" [text]="true" (onClick)="irParaMinhas()" />
                    <p-button label="Fechar" (onClick)="visivel.set(false)" />
                </div>
            } @else {
                <form [formGroup]="form" (ngSubmit)="enviar()" class="flex flex-col gap-4">
                    <p class="m-0 text-sm text-muted-color">
                        Anúncio <strong>{{ codigo() }}</strong>. Sua identidade não é mostrada ao anunciante.
                    </p>
                    <fieldset class="border-0 p-0 m-0">
                        <legend class="font-semibold mb-2">Qual é o problema?</legend>
                        <div class="flex flex-col gap-2 max-h-[18rem] overflow-y-auto pr-1">
                            @for (t of tipos(); track t.id) {
                                <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer" [class.border-primary]="form.value.tipoId === t.id" [class.border-surface]="form.value.tipoId !== t.id">
                                    <input type="radio" formControlName="tipoId" [value]="t.id" class="mt-1" />
                                    <span>
                                        <span class="block font-medium">{{ t.nome }}</span>
                                        @if (t.descricao) {
                                            <span class="block text-sm text-muted-color">{{ t.descricao }}</span>
                                        }
                                    </span>
                                </label>
                            }
                        </div>
                    </fieldset>
                    <div class="flex flex-col gap-1">
                        <label for="denuncia-descricao" class="font-semibold">Conte o que aconteceu</label>
                        <textarea pTextarea id="denuncia-descricao" formControlName="descricao" rows="4" [autoResize]="true" maxlength="500" aria-describedby="denuncia-ajuda"></textarea>
                        <small id="denuncia-ajuda" class="text-muted-color">Mínimo de 20 caracteres ({{ tamanho() }}/500). Detalhes ajudam a análise: o que está errado, onde você viu etc.</small>
                    </div>
                    <div class="flex justify-end gap-2">
                        <p-button label="Cancelar" [text]="true" severity="secondary" (onClick)="visivel.set(false)" />
                        <p-button type="submit" label="Enviar denúncia" icon="pi pi-flag" severity="danger" [loading]="enviando()" [disabled]="form.invalid" />
                    </div>
                </form>
            }
        </p-dialog>
    `
})
export class DenunciarDialog {
    auth = inject(AuthService);
    private moderacao = inject(ModeracaoService);
    private msg = inject(MessageService);
    private router = inject(Router);

    imovelId = input.required<number>();
    codigo = input('');
    visivel = model(false);

    tipos = signal<TipoDenunciaPublico[]>([]);
    enviando = signal(false);
    enviada = signal(false);

    form = new FormGroup({
        tipoId: new FormControl<number | null>(null, Validators.required),
        descricao: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(20), Validators.maxLength(500)] })
    });
    private descricao = signal('');
    tamanho = computed(() => this.descricao().trim().length);

    constructor() {
        this.form.controls.descricao.valueChanges.subscribe((v) => this.descricao.set(v));
    }

    aoAbrir() {
        this.enviada.set(false);
        if (this.auth.logado() && !this.tipos().length) {
            this.moderacao.tipos().subscribe({ next: (t) => this.tipos.set(t), error: (e) => this.msg.add({ severity: 'error', summary: 'Denúncia', detail: mensagemErro(e) }) });
        }
    }

    enviar() {
        if (this.form.invalid) return;
        const v = this.form.getRawValue();
        this.enviando.set(true);
        this.moderacao.denunciar(this.imovelId(), v.tipoId!, v.descricao.trim()).subscribe({
            next: () => {
                this.enviando.set(false);
                this.enviada.set(true);
                this.form.reset({ tipoId: null, descricao: '' });
            },
            error: (e) => {
                this.enviando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível enviar', detail: mensagemErro(e) });
            }
        });
    }

    entrar() {
        this.visivel.set(false);
        this.router.navigate(['/conta/login'], { queryParams: { voltar: this.router.url } });
    }

    irParaMinhas() {
        this.visivel.set(false);
        this.router.navigate(['/conta/denuncias']);
    }
}
