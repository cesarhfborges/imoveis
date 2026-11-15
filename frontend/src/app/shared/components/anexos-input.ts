import { Component, computed, inject, input, model, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { UploadService } from '@/app/core/services/conta.service';
import { mensagemErro } from '@/app/core/services/api.service';

/** Só imagens (JPG, PNG, WEBP) e PDF. */
const TIPOS: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'application/pdf': ['pdf']
};
const MAX_BYTES = 5 * 1024 * 1024;

interface AnexoLocal {
    url: string;
    nome: string;
    pdf: boolean;
}

/**
 * Anexos de uma mensagem de pendência: <b>somente fotos e PDF</b> (o navegador só oferece esses tipos e
 * o arquivo é conferido aqui e no servidor, que também confere o conteúdo). Até 10 arquivos de 5 MB.
 */
@Component({
    selector: 'app-anexos-input',
    imports: [ButtonModule],
    template: `
        <div class="flex flex-wrap items-center gap-2">
            <input
                #seletor
                type="file"
                class="hidden"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                (change)="escolher($any($event.target).files); seletor.value = ''"
                [attr.aria-label]="'Escolher anexos'"
            />
            <p-button label="Anexar foto ou PDF" icon="pi pi-paperclip" [text]="true" size="small" [loading]="enviando()" [disabled]="lista().length >= 10" (onClick)="seletor.click()" />
            <small class="text-muted-color">JPG, PNG, WEBP ou PDF · até 5 MB cada</small>
        </div>
        @if (visiveis().length) {
            <ul class="list-none m-0 mt-2 p-0 flex flex-wrap gap-2" aria-label="Anexos desta mensagem">
                @for (a of visiveis(); track a.url) {
                    <li class="inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full border border-surface text-sm max-w-full">
                        <i class="pi" [class.pi-file-pdf]="a.pdf" [class.pi-image]="!a.pdf" [class.text-red-600]="a.pdf" aria-hidden="true"></i>
                        <span class="truncate max-w-[14rem]">{{ a.nome }}</span>
                        <p-button icon="pi pi-times" [text]="true" [rounded]="true" size="small" severity="secondary" [ariaLabel]="'Remover o anexo ' + a.nome" (onClick)="remover(a)" />
                    </li>
                }
            </ul>
        }
    `
})
export class AnexosInput {
    private upload = inject(UploadService);
    private msg = inject(MessageService);

    /** URLs dos anexos enviados (two-way: [(anexos)]). */
    anexos = model<string[] | null | undefined>([]);
    lista = computed(() => this.anexos() ?? []);
    desabilitado = input(false);

    enviando = signal(false);
    private itens = signal<AnexoLocal[]>([]);
    /** Só os que continuam na lista (quem usa pode zerar [(anexos)] depois de enviar). */
    visiveis = computed(() => this.itens().filter((i) => this.lista().includes(i.url)));

    escolher(arquivos: FileList | null) {
        for (const f of Array.from(arquivos ?? [])) {
            if (this.lista().length >= 10) break;
            const ext = f.name.includes('.') ? f.name.split('.').pop()!.toLowerCase() : '';
            if (!TIPOS[f.type]?.includes(ext)) {
                this.msg.add({ severity: 'warn', summary: 'Anexo recusado', detail: `"${f.name}": só são aceitas fotos (JPG, PNG, WEBP) e PDF.` });
                continue;
            }
            if (f.size > MAX_BYTES) {
                this.msg.add({ severity: 'warn', summary: 'Anexo recusado', detail: `"${f.name}" passa de 5 MB.` });
                continue;
            }
            this.enviando.set(true);
            this.upload.enviar(f, '/app/denuncias/anexos').subscribe({
                next: (r) => {
                    this.enviando.set(false);
                    this.itens.update((l) => [...l, { url: r.url, nome: f.name, pdf: f.type === 'application/pdf' }]);
                    this.anexos.update((l) => [...(l ?? []), r.url]);
                },
                error: (e) => {
                    this.enviando.set(false);
                    this.msg.add({ severity: 'error', summary: 'Anexo', detail: mensagemErro(e) });
                }
            });
        }
    }

    remover(a: AnexoLocal) {
        this.itens.update((l) => l.filter((x) => x.url !== a.url));
        this.anexos.update((l) => (l ?? []).filter((u) => u !== a.url));
    }
}
