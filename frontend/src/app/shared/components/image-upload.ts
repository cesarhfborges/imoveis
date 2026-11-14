import { Component, inject, input, output, signal } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { UploadService } from '@/app/core/services/conta.service';
import { mensagemErro } from '@/app/core/services/api.service';

let seq = 0;

/** Campo de imagem: colar uma URL ou enviar um arquivo (JPG, PNG, WEBP, GIF ou ICO), com prévia. */
@Component({
    selector: 'app-image-upload',
    imports: [InputTextModule, ButtonModule],
    template: `
        <div class="flex flex-col gap-2">
            <label [for]="id" class="font-medium">{{ rotulo() }}</label>
            <div class="flex items-center gap-3">
                <div class="w-14 h-14 rounded-border border border-surface flex items-center justify-center overflow-hidden shrink-0 bg-surface-50 dark:bg-surface-800">
                    @if (url()) {
                        <img [src]="url()" [alt]="'Prévia: ' + rotulo()" class="max-w-full max-h-full object-contain" />
                    } @else {
                        <i class="pi pi-image text-muted-color" aria-hidden="true"></i>
                    }
                </div>
                <input pInputText [id]="id" class="flex-1 min-w-0" [value]="url() ?? ''" (change)="definir($any($event.target).value)" placeholder="https://... ou envie um arquivo" />
                <input #arquivo type="file" class="hidden" [accept]="aceitar()" (change)="enviar($any($event.target).files)" [attr.aria-label]="'Arquivo para ' + rotulo()" />
                <p-button icon="pi pi-upload" [outlined]="true" [loading]="enviando()" (onClick)="arquivo.click()" [ariaLabel]="'Enviar arquivo para ' + rotulo()" />
                @if (url()) {
                    <p-button icon="pi pi-times" [text]="true" severity="secondary" (onClick)="definir(null)" [ariaLabel]="'Remover ' + rotulo()" />
                }
            </div>
        </div>
    `
})
export class ImageUpload {
    private upload = inject(UploadService);
    private msg = inject(MessageService);

    id = 'img-up-' + ++seq;
    rotulo = input('Imagem');
    url = input<string | null>(null);
    aceitar = input('image/png,image/jpeg,image/webp,image/gif,image/x-icon');
    urlChange = output<string | null>();
    enviando = signal(false);

    definir(v: string | null) {
        this.urlChange.emit(v?.trim() || null);
    }

    enviar(files: FileList | null) {
        const f = files?.[0];
        if (!f) return;
        this.enviando.set(true);
        this.upload.enviar(f).subscribe({
            next: (r) => {
                this.enviando.set(false);
                this.urlChange.emit(r.url);
            },
            error: (e) => {
                this.enviando.set(false);
                this.msg.add({ severity: 'error', summary: 'Envio de imagem', detail: mensagemErro(e) });
            }
        });
    }
}
