import { Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorInitEvent, EditorModule, EditorTextChangeEvent } from 'primeng/editor';

/** Texto puro de um HTML do editor (para contar caracteres e saber se está vazio). */
export function textoDoHtml(html: string | null | undefined): string {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent ?? '').replace(/ /g, ' ').trim();
}

export function htmlVazio(html: string | null | undefined): boolean {
    return textoDoHtml(html).length === 0;
}

/**
 * Editor de texto (Quill, via p-editor do PrimeNG) com uma barra enxuta (negrito, itálico, sublinhado,
 * listas, citação e link) e contador de caracteres. O valor é HTML; o backend limpa o que não for permitido.
 */
@Component({
    selector: 'app-editor-texto',
    imports: [EditorModule, FormsModule],
    template: `
        <p-editor [ngModel]="valor()" (ngModelChange)="valor.set($event)" [placeholder]="placeholder()" [style]="{ height: altura() }" (onTextChange)="aoMudar($event)" (onInit)="aoIniciar($event)" [formats]="formatos" [readonly]="desabilitado()">
            <ng-template #header>
                <span class="ql-formats">
                    <button type="button" class="ql-bold" aria-label="Negrito"></button>
                    <button type="button" class="ql-italic" aria-label="Itálico"></button>
                    <button type="button" class="ql-underline" aria-label="Sublinhado"></button>
                    <button type="button" class="ql-strike" aria-label="Tachado"></button>
                </span>
                <span class="ql-formats">
                    <button type="button" class="ql-list" value="ordered" aria-label="Lista numerada"></button>
                    <button type="button" class="ql-list" value="bullet" aria-label="Lista com marcadores"></button>
                    <button type="button" class="ql-blockquote" aria-label="Citação"></button>
                </span>
                <span class="ql-formats">
                    <button type="button" class="ql-link" aria-label="Inserir link"></button>
                    <button type="button" class="ql-clean" aria-label="Limpar formatação"></button>
                </span>
            </ng-template>
        </p-editor>
        <div class="flex justify-end mt-1">
            <small [id]="idContador()" [class.text-red-700]="excedeu()" [class.font-semibold]="excedeu()" [class.text-muted-color]="!excedeu()" aria-live="polite">{{ tamanho() }}/{{ max() }} caracteres</small>
        </div>
    `,
    styles: `
        :host {
            display: block;
        }
        :host ::ng-deep .p-editor .p-editor-content .ql-editor {
            font-size: 0.95rem;
            line-height: 1.5;
        }
    `
})
export class EditorTexto {
    /** HTML do editor (two-way: [(valor)]). */
    valor = model<string>('');
    placeholder = input('');
    altura = input('8rem');
    max = input(5000);
    /** Nome acessível da área de edição. */
    rotulo = input('Mensagem');
    desabilitado = input(false);

    readonly formatos = ['bold', 'italic', 'underline', 'strike', 'list', 'blockquote', 'link'];
    private texto = signal('');
    tamanho = computed(() => this.texto().length);
    excedeu = computed(() => this.tamanho() > this.max());
    private static seq = 0;
    idContador = signal(`editor-contador-${++EditorTexto.seq}`);

    aoMudar(e: EditorTextChangeEvent) {
        this.texto.set((e.textValue ?? '').replace(/\n$/, '').trim());
    }

    aoIniciar(e: EditorInitEvent) {
        const raiz: HTMLElement = e.editor.root;
        raiz.setAttribute('role', 'textbox');
        raiz.setAttribute('aria-multiline', 'true');
        raiz.setAttribute('aria-label', this.rotulo());
        raiz.setAttribute('aria-describedby', this.idContador());
        this.texto.set(textoDoHtml(this.valor()));
    }
}
