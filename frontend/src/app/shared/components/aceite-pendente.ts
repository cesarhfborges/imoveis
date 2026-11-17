import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { DocumentoPublico } from '@/app/core/models/models';
import { AuthService } from '@/app/core/services/auth.service';
import { DocumentoService } from '@/app/core/services/documento.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { DocumentoConteudo } from './documento-conteudo';

/** Intervalo mínimo entre verificações ao navegar (a verificação também acontece ao entrar/trocar de perfil). */
const INTERVALO_MS = 5 * 60 * 1000;

/**
 * Documentos que o usuário logado precisa aceitar (Configurações › Documentos, "exigir de quem já tem conta").
 * Enquanto houver pendência, um diálogo bloqueia o uso: a pessoa lê, marca e aceita, ou sai da conta.
 */
@Component({
    selector: 'app-aceite-pendente',
    imports: [FormsModule, DialogModule, ButtonModule, CheckboxModule, MessageModule, DocumentoConteudo],
    template: `
        <p-dialog [visible]="pendentes().length > 0" [modal]="true" [closable]="false" [closeOnEscape]="false" [draggable]="false" [style]="{ width: '46rem' }" [breakpoints]="{ '768px': '96vw' }" header="Atualizamos nossos documentos">
            <p class="mt-0 text-muted-color">Para continuar usando a sua conta, leia e aceite {{ pendentes().length > 1 ? 'os documentos abaixo' : 'o documento abaixo' }}.</p>
            <div class="flex flex-col gap-3">
                @for (d of pendentes(); track d.id) {
                    <section class="rounded-border border" [class]="aceitos().has(d.id) ? 'border-primary' : 'border-surface'" [attr.aria-labelledby]="'pend-' + d.id">
                        <div class="flex items-start justify-between gap-3 p-3">
                            <div class="min-w-0">
                                <h3 [id]="'pend-' + d.id" class="text-base font-semibold m-0">{{ d.titulo }}</h3>
                                <span class="text-xs text-muted-color">Versão {{ d.versao }}{{ d.resumo ? ' · ' + d.resumo : '' }}</span>
                            </div>
                            <p-button [label]="aberto() === d.id ? 'Fechar' : 'Ler aqui'" [icon]="aberto() === d.id ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" size="small" [text]="true" (onClick)="aberto.set(aberto() === d.id ? null : d.id)" [ariaExpanded]="aberto() === d.id" />
                        </div>
                        @if (aberto() === d.id) {
                            <div class="max-h-80 overflow-y-auto px-4 py-3 border-y border-surface bg-surface-50 dark:bg-surface-950" tabindex="0" [attr.aria-label]="'Texto de ' + d.titulo">
                                <app-documento-conteudo [html]="d.conteudo" />
                            </div>
                        }
                        <div class="flex items-center gap-2 p-3">
                            <p-checkbox [inputId]="'pend-aceite-' + d.id" [binary]="true" [ngModel]="aceitos().has(d.id)" (ngModelChange)="marcar(d.id, $event)" />
                            <label [for]="'pend-aceite-' + d.id" class="cursor-pointer text-sm">Li e aceito {{ d.titulo.toLowerCase().startsWith('termos') ? 'os' : '' }} <strong>{{ d.titulo }}</strong></label>
                            <a [href]="'/documentos/' + d.slug" target="_blank" rel="noopener" class="ml-auto text-xs text-primary hover:underline">Abrir em nova aba</a>
                        </div>
                    </section>
                }
            </div>
            @if (erro()) {
                <p-message severity="error" [text]="erro()!" styleClass="mt-3" />
            }
            <ng-template #footer>
                <p-button label="Sair da conta" severity="secondary" [text]="true" (onClick)="sair()" />
                <p-button label="Aceitar e continuar" icon="pi pi-check" [disabled]="!todosAceitos()" [loading]="enviando()" (onClick)="aceitar()" />
            </ng-template>
        </p-dialog>
    `
})
export class AceitePendente {
    private auth = inject(AuthService);
    private documentos = inject(DocumentoService);
    private msg = inject(MessageService);

    pendentes = signal<DocumentoPublico[]>([]);
    aceitos = signal(new Set<number>());
    aberto = signal<number | null>(null);
    enviando = signal(false);
    erro = signal<string | null>(null);
    private ultimaVerificacao = 0;

    constructor() {
        // verifica ao entrar, ao sair e ao trocar de perfil
        effect(() => {
            const s = this.auth.sessao();
            untracked(() => (s.autenticado && s.perfil !== 'ADMIN' ? this.verificar() : this.limpar()));
        });
        // e de tempos em tempos ao navegar (pega versões publicadas durante a sessão)
        inject(Router)
            .events.pipe(
                filter((e) => e instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                const s = this.auth.sessao();
                if (s.autenticado && s.perfil !== 'ADMIN' && Date.now() - this.ultimaVerificacao > INTERVALO_MS) this.verificar();
            });
    }

    todosAceitos() {
        return this.pendentes().every((d) => this.aceitos().has(d.id));
    }

    marcar(id: number, sim: boolean) {
        this.aceitos.update((s) => {
            const n = new Set(s);
            if (sim) n.add(id);
            else n.delete(id);
            return n;
        });
    }

    private verificar() {
        this.ultimaVerificacao = Date.now();
        this.documentos.pendentes().subscribe({
            next: (l) => {
                this.pendentes.set(l);
                if (l.length === 1) this.aberto.set(l[0].id);
            },
            error: () => undefined
        });
    }

    private limpar() {
        this.pendentes.set([]);
        this.aceitos.set(new Set());
        this.aberto.set(null);
    }

    aceitar() {
        this.enviando.set(true);
        this.erro.set(null);
        this.documentos.aceitar(this.pendentes().map((d) => ({ documentoId: d.id, versao: d.versao }))).subscribe({
            next: () => {
                this.enviando.set(false);
                this.limpar();
                this.msg.add({ severity: 'success', summary: 'Obrigado!', detail: 'Aceite registrado.' });
            },
            error: (e) => {
                this.enviando.set(false);
                this.erro.set(mensagemErro(e, 'Não foi possível registrar o aceite.'));
                // versão mudou enquanto a pessoa lia: recarrega a lista
                this.verificar();
                this.aceitos.set(new Set());
            }
        });
    }

    sair() {
        this.limpar();
        this.auth.sair('/');
    }
}
