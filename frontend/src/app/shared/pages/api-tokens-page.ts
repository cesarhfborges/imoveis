import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApiToken, Perfil, perfilLabel } from '@/app/core/models/models';
import { ContaService } from '@/app/core/services/conta.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { TabelaResponsiva } from '@/app/shared/directives/tabela-responsiva';

/** Tokens Bearer para a API aberta (/api/v1). O valor aparece uma única vez, na criação. */
@Component({
    selector: 'app-api-tokens-page',
    imports: [DatePipe, ReactiveFormsModule, TableModule, TabelaResponsiva, ButtonModule, InputTextModule, SelectModule, InputNumberModule, MessageModule, TagModule, PageHeader],
    template: `
        <app-page-header titulo="Tokens da API" subtitulo="Integre outros sistemas usando a API aberta com autenticação Bearer. Disponível para corretores e administradores." />

        <div class="grid grid-cols-12 gap-6">
            <form class="card col-span-12 lg:col-span-5 flex flex-col gap-4 m-0" [formGroup]="form" (ngSubmit)="criar()">
                <h2 class="text-lg font-semibold m-0">Novo token</h2>
                <div class="flex flex-col gap-2">
                    <label for="tk-nome">Nome (para você reconhecer)</label>
                    <input pInputText id="tk-nome" formControlName="nome" placeholder="Ex.: Integração do meu CRM" />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="tk-perfil">Perfil do token</label>
                    <p-select inputId="tk-perfil" formControlName="perfil" [options]="perfis()" optionLabel="label" optionValue="value" styleClass="w-full" />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="tk-dias">Validade em dias (vazio = sem validade)</label>
                    <p-inputnumber inputId="tk-dias" formControlName="validadeDias" [min]="1" [max]="3650" styleClass="w-full" inputStyleClass="w-full" />
                </div>
                <div class="flex justify-end"><p-button type="submit" label="Gerar token" icon="pi pi-key" [loading]="criando()" /></div>

                @if (novoToken()) {
                    <p-message severity="success">
                        <div class="flex flex-col gap-2 w-full">
                            <strong>Copie agora: este valor não será mostrado de novo.</strong>
                            <code class="break-all bg-surface-0 dark:bg-surface-900 p-2 rounded-border text-sm">{{ novoToken() }}</code>
                            <p-button label="Copiar" icon="pi pi-copy" size="small" [outlined]="true" (onClick)="copiar()" />
                        </div>
                    </p-message>
                }
            </form>

            <div class="card col-span-12 lg:col-span-7 m-0">
                <h2 class="text-lg font-semibold mt-0">Como usar</h2>
                <pre class="bg-surface-100 dark:bg-surface-800 p-3 rounded-border text-sm overflow-x-auto"><code>curl -H "Authorization: Bearer imv_..." \\
  "{{ origem }}/api/v1/imoveis?finalidade=VENDA&amp;cidade=Brasília"</code></pre>
                <ul class="text-sm text-muted-color pl-4 leading-7">
                    <li><code>GET /api/v1/imoveis</code>, <code>/api/v1/imoveis/&#123;id&#125;</code>: consulta de anúncios (qualquer token)</li>
                    <li><code>/api/v1/corretor/imoveis</code>: seus anúncios (token com perfil Corretor)</li>
                    <li><code>/api/v1/admin/imoveis</code>: todos os anúncios (token com perfil Administrador)</li>
                </ul>
            </div>

            <div class="card col-span-12 m-0">
                <h2 class="text-lg font-semibold mt-0">Tokens ativos</h2>
                <p-table appTabelaResponsiva [value]="tokens()" dataKey="id" [tableStyle]="{ 'min-width': '40rem' }">
                    <ng-template #header>
                        <tr>
                            <th scope="col">Nome</th>
                            <th scope="col">Início</th>
                            <th scope="col">Perfil</th>
                            <th scope="col">Criado</th>
                            <th scope="col">Expira</th>
                            <th scope="col">Último uso</th>
                            <th scope="col"><span class="sr-only">Ações</span></th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-t>
                        <tr>
                            <td>{{ t.nome }}</td>
                            <td>
                                <code>{{ t.prefixo }}…</code>
                            </td>
                            <td><p-tag [value]="rotulo(t.perfil)" severity="secondary" /></td>
                            <td>{{ t.criadoEm | date: 'dd/MM/yyyy' }}</td>
                            <td>{{ t.expiraEm ? (t.expiraEm | date: 'dd/MM/yyyy') : 'Nunca' }}</td>
                            <td>{{ t.ultimoUso ? (t.ultimoUso | date: 'dd/MM/yyyy HH:mm') : '—' }}</td>
                            <td class="text-right"><p-button icon="pi pi-trash" severity="danger" [text]="true" [rounded]="true" (onClick)="revogar(t)" [ariaLabel]="'Revogar ' + t.nome" /></td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="7" class="text-center py-6 text-muted-color">Nenhum token ativo.</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>
        </div>
    `
})
export class ApiTokensPage {
    private conta = inject(ContaService);
    private auth = inject(AuthService);
    private msg = inject(MessageService);
    private confirm = inject(ConfirmationService);
    private fb = inject(NonNullableFormBuilder);

    origem = location.origin;
    tokens = signal<ApiToken[]>([]);
    criando = signal(false);
    novoToken = signal<string | null>(null);
    /** Clientes não têm token de API: só os perfis de corretor e administrador. */
    perfis = computed(() =>
        this.auth
            .sessao()
            .perfisDisponiveis.filter((p) => p !== 'CLIENTE')
            .map((p) => ({ value: p, label: perfilLabel(p) }))
    );

    form = this.fb.group({
        nome: ['', [Validators.required, Validators.maxLength(80)]],
        perfil: this.fb.control<Perfil>(this.auth.perfil() === 'ADMIN' ? 'ADMIN' : 'CORRETOR'),
        validadeDias: this.fb.control<number | null>(90)
    });

    constructor() {
        inject(ConfigService).definirTitulo('Tokens da API');
        this.carregar();
    }

    rotulo(p: Perfil) {
        return perfilLabel(p);
    }

    carregar() {
        this.conta.tokens().subscribe({ next: (t) => this.tokens.set(t), error: () => this.tokens.set([]) });
    }

    criar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const v = this.form.getRawValue();
        this.criando.set(true);
        this.conta.criarToken(v.nome, v.perfil, v.validadeDias).subscribe({
            next: (r) => {
                this.criando.set(false);
                this.novoToken.set(r.token);
                this.form.controls.nome.reset();
                this.carregar();
            },
            error: (e) => {
                this.criando.set(false);
                this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(e) });
            }
        });
    }

    copiar() {
        navigator.clipboard?.writeText(this.novoToken() ?? '').then(() => this.msg.add({ severity: 'success', summary: 'Token copiado' }));
    }

    revogar(t: ApiToken) {
        this.confirm.confirm({
            header: 'Revogar token',
            message: `Sistemas que usam "${t.nome}" deixarão de funcionar. Continuar?`,
            acceptButtonProps: { label: 'Revogar', severity: 'danger' },
            rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
            accept: () => this.conta.revogarToken(t.id).subscribe(() => this.carregar())
        });
    }
}
