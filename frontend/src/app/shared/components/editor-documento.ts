import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorInitEvent, EditorModule, EditorTextChangeEvent } from 'primeng/editor';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { UploadService } from '@/app/core/services/conta.service';
import { mensagemErro } from '@/app/core/services/api.service';

/** API mínima do Quill 2 usada aqui (o tipo completo não é exportado pelo PrimeNG). */
interface QuillLike {
    root: HTMLElement;
    getModule(nome: string): any;
    getSelection(foco?: boolean): { index: number; length: number } | null;
    insertEmbed(index: number, tipo: string, valor: string, origem?: string): void;
    setSelection(index: number, length?: number): void;
    getText(): string;
    history: { undo(): void; redo(): void };
    clipboard?: { addMatcher?(seletor: number | string, fn: (no: Node, delta: { ops: { insert?: unknown }[] }) => unknown): void };
}

/**
 * Editor de documentos (termos de uso, política de privacidade, código de conduta…): Quill com a barra completa
 * (títulos, tamanhos, cores, alinhamento, recuo, sobrescrito/subscrito, código, lista de tarefas, tabelas, imagens),
 * desfazer/refazer, tela cheia e contagem de palavras/tempo de leitura. O valor é HTML; o backend limpa o que
 * não for permitido (TextoDocumento).
 */
@Component({
    selector: 'app-editor-documento',
    imports: [EditorModule, FormsModule, TooltipModule],
    host: { '[class.editor-doc--cheio]': 'telaCheia()', class: 'editor-doc' },
    template: `
        <p-editor [ngModel]="valor()" (ngModelChange)="valor.set($event)" [placeholder]="placeholder()" [style]="{ height: telaCheia() ? 'calc(100vh - 9.5rem)' : altura() }" [modules]="modulos" (onInit)="aoIniciar($event)" (onTextChange)="aoMudar($event)">
            <ng-template #header>
                <span class="ql-formats">
                    <button type="button" (click)="desfazer()" aria-label="Desfazer" pTooltip="Desfazer (Ctrl+Z)" tooltipPosition="bottom"><i class="pi pi-undo"></i></button>
                    <button type="button" (click)="refazer()" aria-label="Refazer" pTooltip="Refazer (Ctrl+Y)" tooltipPosition="bottom"><i class="pi pi-refresh"></i></button>
                </span>
                <span class="ql-formats">
                    <select class="ql-header" aria-label="Estilo do parágrafo">
                        <option value="1">Título 1</option>
                        <option value="2">Título 2</option>
                        <option value="3">Título 3</option>
                        <option value="4">Título 4</option>
                        <option value="5">Título 5</option>
                        <option value="6">Título 6</option>
                        <option selected>Normal</option>
                    </select>
                    <select class="ql-size" aria-label="Tamanho do texto">
                        <option value="small">Pequeno</option>
                        <option selected>Normal</option>
                        <option value="large">Grande</option>
                        <option value="huge">Enorme</option>
                    </select>
                </span>
                <span class="ql-formats">
                    <button type="button" class="ql-bold" aria-label="Negrito"></button>
                    <button type="button" class="ql-italic" aria-label="Itálico"></button>
                    <button type="button" class="ql-underline" aria-label="Sublinhado"></button>
                    <button type="button" class="ql-strike" aria-label="Tachado"></button>
                    <button type="button" class="ql-script" value="sub" aria-label="Subscrito"></button>
                    <button type="button" class="ql-script" value="super" aria-label="Sobrescrito"></button>
                </span>
                <span class="ql-formats">
                    <select class="ql-color" aria-label="Cor do texto"></select>
                    <select class="ql-background" aria-label="Cor de fundo"></select>
                </span>
                <span class="ql-formats">
                    <button type="button" class="ql-list" value="ordered" aria-label="Lista numerada"></button>
                    <button type="button" class="ql-list" value="bullet" aria-label="Lista com marcadores"></button>
                    <button type="button" class="ql-list" value="check" aria-label="Lista de verificação"></button>
                    <button type="button" class="ql-indent" value="-1" aria-label="Diminuir recuo"></button>
                    <button type="button" class="ql-indent" value="+1" aria-label="Aumentar recuo"></button>
                    <select class="ql-align" aria-label="Alinhamento">
                        <option selected></option>
                        <option value="center"></option>
                        <option value="right"></option>
                        <option value="justify"></option>
                    </select>
                </span>
                <span class="ql-formats">
                    <button type="button" class="ql-blockquote" aria-label="Citação"></button>
                    <button type="button" class="ql-code-block" aria-label="Bloco de código"></button>
                    <button type="button" class="ql-link" aria-label="Inserir link"></button>
                    <button type="button" class="ql-image" aria-label="Inserir imagem"></button>
                </span>
                <span class="ql-formats">
                    <button type="button" (click)="tabela('inserir')" aria-label="Inserir tabela 3×3" pTooltip="Inserir tabela" tooltipPosition="bottom"><i class="pi pi-table"></i></button>
                    <button type="button" (click)="tabela('linha')" aria-label="Inserir linha abaixo" pTooltip="Linha abaixo" tooltipPosition="bottom"><i class="pi pi-arrow-down"></i></button>
                    <button type="button" (click)="tabela('coluna')" aria-label="Inserir coluna à direita" pTooltip="Coluna à direita" tooltipPosition="bottom"><i class="pi pi-arrow-right"></i></button>
                    <button type="button" (click)="tabela('excluirLinha')" aria-label="Excluir linha" pTooltip="Excluir linha" tooltipPosition="bottom"><i class="pi pi-minus"></i></button>
                    <button type="button" (click)="tabela('excluirColuna')" aria-label="Excluir coluna" pTooltip="Excluir coluna" tooltipPosition="bottom"><i class="pi pi-ellipsis-v"></i></button>
                    <button type="button" (click)="tabela('excluir')" aria-label="Excluir tabela" pTooltip="Excluir tabela" tooltipPosition="bottom"><i class="pi pi-trash"></i></button>
                </span>
                <span class="ql-formats">
                    <button type="button" class="ql-clean" aria-label="Limpar formatação"></button>
                    <button type="button" (click)="telaCheia.set(!telaCheia())" [attr.aria-label]="telaCheia() ? 'Sair da tela cheia' : 'Tela cheia'" [attr.aria-pressed]="telaCheia()" [pTooltip]="telaCheia() ? 'Sair da tela cheia (Esc)' : 'Tela cheia'" tooltipPosition="bottom">
                        <i class="pi" [class.pi-window-maximize]="!telaCheia()" [class.pi-window-minimize]="telaCheia()"></i>
                    </button>
                </span>
            </ng-template>
        </p-editor>
        <div class="flex flex-wrap justify-between gap-2 mt-2 text-sm text-muted-color" aria-live="polite">
            <span>
                @if (enviandoImagem()) {
                    <i class="pi pi-spin pi-spinner text-xs" aria-hidden="true"></i> Enviando imagem…
                } @else {
                    Dica: use "Título 2" e "Título 3" para as seções; o site monta o índice do documento a partir deles.
                }
            </span>
            <span>{{ palavras() }} palavras · {{ leitura() }} min de leitura</span>
        </div>
    `,
    styles: `
        :host {
            display: block;
        }
        :host.editor-doc--cheio {
            position: fixed;
            inset: 0;
            z-index: 1100;
            padding: 1rem;
            background: var(--p-content-background);
        }
        :host ::ng-deep .p-editor .p-editor-toolbar {
            position: sticky;
            top: 0;
            z-index: 1;
        }
        :host ::ng-deep .p-editor .p-editor-toolbar button .pi {
            font-size: 0.85rem;
            color: var(--p-text-muted-color);
        }
        :host ::ng-deep .p-editor .p-editor-toolbar button:hover .pi {
            color: var(--p-primary-color);
        }
        :host ::ng-deep .p-editor .p-editor-content .ql-editor {
            font-size: 1rem;
            line-height: 1.65;
            padding: 1.5rem 2rem;
        }
        :host ::ng-deep .ql-editor table {
            border-collapse: collapse;
            width: 100%;
        }
        :host ::ng-deep .ql-editor td {
            border: 1px solid var(--p-content-border-color);
            padding: 0.4rem 0.6rem;
        }
    `
})
export class EditorDocumento {
    private upload = inject(UploadService);
    private msg = inject(MessageService);

    /** HTML do documento (two-way: [(valor)]). */
    valor = model<string>('');
    placeholder = input('Escreva o documento…');
    altura = input('32rem');
    /** Emitido quando a pessoa altera o conteúdo (não dispara ao carregar). */
    editado = output<void>();

    readonly modulos = { table: true, history: { delay: 1000, maxStack: 200, userOnly: true } };
    private quill: QuillLike | null = null;
    private texto = signal('');
    telaCheia = signal(false);
    enviandoImagem = signal(false);

    palavras = computed(() => (this.texto().trim() ? this.texto().trim().split(/\s+/).length : 0));
    /** ~200 palavras por minuto, no mínimo 1. */
    leitura = computed(() => Math.max(1, Math.round(this.palavras() / 200)));

    aoIniciar(e: EditorInitEvent) {
        this.quill = e.editor as QuillLike;
        this.texto.set(this.quill.getText());
        const raiz = this.quill.root;
        raiz.setAttribute('aria-label', 'Conteúdo do documento');
        raiz.setAttribute('aria-multiline', 'true');
        raiz.setAttribute('role', 'textbox');
        // ao colar do Word/Docs/chat, troca &nbsp; (espaço que não quebra linha) por espaço normal
        this.quill.clipboard?.addMatcher?.(Node.TEXT_NODE, (_no: Node, delta: { ops: { insert?: unknown }[] }) => {
            delta.ops.forEach((op) => {
                if (typeof op.insert === 'string') op.insert = op.insert.replace(/\u00A0/g, ' ');
            });
            return delta;
        });
        // imagens vão para o servidor (o backend não aceita imagem embutida em base64)
        this.quill.getModule('toolbar')?.addHandler('image', () => this.escolherImagem());
        raiz.addEventListener('keydown', (ev: KeyboardEvent) => {
            if (ev.key === 'Escape' && this.telaCheia()) this.telaCheia.set(false);
        });
    }

    aoMudar(e: EditorTextChangeEvent) {
        this.texto.set(e.textValue ?? '');
        // só edição da pessoa conta como alteração (o Quill também emite ao normalizar o HTML carregado)
        if (e.source === 'user') this.editado.emit();
    }

    desfazer() {
        this.quill?.history.undo();
    }

    refazer() {
        this.quill?.history.redo();
    }

    tabela(acao: 'inserir' | 'linha' | 'coluna' | 'excluirLinha' | 'excluirColuna' | 'excluir') {
        const t = this.quill?.getModule('table');
        if (!t) return;
        if (acao !== 'inserir' && !this.quill?.getSelection()) {
            this.msg.add({ severity: 'info', summary: 'Tabela', detail: 'Clique numa célula da tabela antes.' });
            return;
        }
        ({
            inserir: () => t.insertTable(3, 3),
            linha: () => t.insertRowBelow(),
            coluna: () => t.insertColumnRight(),
            excluirLinha: () => t.deleteRow(),
            excluirColuna: () => t.deleteColumn(),
            excluir: () => t.deleteTable()
        })[acao]();
    }

    private escolherImagem() {
        const entrada = document.createElement('input');
        entrada.type = 'file';
        entrada.accept = 'image/png,image/jpeg,image/webp,image/gif';
        entrada.onchange = () => {
            const arquivo = entrada.files?.[0];
            if (!arquivo || !this.quill) return;
            const posicao = this.quill.getSelection(true)?.index ?? this.quill.getText().length;
            this.enviandoImagem.set(true);
            this.upload.enviar(arquivo).subscribe({
                next: ({ url }) => {
                    this.enviandoImagem.set(false);
                    this.quill!.insertEmbed(posicao, 'image', url, 'user');
                    this.quill!.setSelection(posicao + 1);
                },
                error: (e) => {
                    this.enviandoImagem.set(false);
                    this.msg.add({ severity: 'error', summary: 'Imagem', detail: mensagemErro(e, 'Não foi possível enviar a imagem.') });
                }
            });
        };
        entrada.click();
    }
}
