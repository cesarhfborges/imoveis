import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PasswordModule } from 'primeng/password';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ConfirmationService, MessageService } from 'primeng/api';
import { debounceTime } from 'rxjs';
import { PageResponse, Perfil, Usuario, perfilLabel } from '@/app/core/models/models';
import { AdminService } from '@/app/core/services/conta.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';

/** Usuários e permissões: papéis (cliente, corretor, administrador), ativação e senha. */
@Component({
    selector: 'app-usuarios-page',
    imports: [DatePipe, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, SelectModule, DialogModule, CheckboxModule, ToggleSwitchModule, PasswordModule, TagModule, IconFieldModule, InputIconModule, PageHeader],
    template: `
        <app-page-header titulo="Usuários e permissões" subtitulo="Administradores também entram como corretor e cliente; corretores também entram como cliente.">
            <p-button label="Novo usuário" icon="pi pi-user-plus" (onClick)="abrir(null)" />
        </app-page-header>
        <div class="card">
            <div class="flex flex-col sm:flex-row gap-3 mb-4">
                <p-iconfield class="flex-1">
                    <p-inputicon class="pi pi-search" />
                    <input pInputText [formControl]="busca" placeholder="Buscar por nome ou e-mail" class="w-full" aria-label="Buscar usuários" />
                </p-iconfield>
                <p-select [options]="papeisOpcoes" optionLabel="label" optionValue="value" [formControl]="papel" placeholder="Todos os papéis" [showClear]="true" styleClass="sm:w-56" ariaLabel="Filtrar por papel" />
            </div>
            <p-table [value]="pagina().content" [lazy]="true" [paginator]="true" [rows]="20" [totalRecords]="pagina().totalElements" [loading]="carregando()" (onLazyLoad)="carregar($event)" dataKey="id" [tableStyle]="{ 'min-width': '50rem' }">
                <ng-template #header>
                    <tr>
                        <th scope="col">Nome</th>
                        <th scope="col">Pode entrar como</th>
                        <th scope="col">Situação</th>
                        <th scope="col">Último acesso</th>
                        <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                </ng-template>
                <ng-template #body let-u>
                    <tr>
                        <td>
                            <div class="font-semibold">{{ u.nome }}</div>
                            <div class="text-sm text-muted-color">{{ u.email }}{{ u.creci ? ' · CRECI ' + u.creci : '' }}</div>
                        </td>
                        <td>
                            <span class="flex flex-wrap gap-1">
                                @for (p of u.perfisPermitidos; track p) {
                                    <p-tag [value]="rotulo(p)" [severity]="p === 'ADMIN' ? 'danger' : p === 'CORRETOR' ? 'info' : 'secondary'" />
                                }
                            </span>
                        </td>
                        <td><p-tag [value]="u.ativo ? 'Ativo' : 'Desativado'" [severity]="u.ativo ? 'success' : 'warn'" /></td>
                        <td>{{ u.ultimoAcesso ? (u.ultimoAcesso | date: 'dd/MM/yy HH:mm') : '—' }}</td>
                        <td class="text-right whitespace-nowrap">
                            <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" (onClick)="abrir(u)" [ariaLabel]="'Editar ' + u.nome" />
                            @if (u.ativo && u.id !== meuId) {
                                <p-button icon="pi pi-ban" severity="danger" [text]="true" [rounded]="true" (onClick)="desativar(u)" [ariaLabel]="'Desativar ' + u.nome" />
                            }
                        </td>
                    </tr>
                </ng-template>
            </p-table>
        </div>

        <p-dialog [visible]="dialogo()" (visibleChange)="dialogo.set($event)" [modal]="true" [header]="editando() ? 'Editar usuário' : 'Novo usuário'" [style]="{ width: '34rem' }" [breakpoints]="{ '575px': '95vw' }">
            <form [formGroup]="form" (ngSubmit)="salvar()" class="flex flex-col gap-4" id="form-usuario">
                <div class="flex flex-col gap-2">
                    <label for="us-nome">Nome</label>
                    <input pInputText id="us-nome" formControlName="nome" />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="us-email">E-mail</label>
                    <input pInputText id="us-email" type="email" formControlName="email" />
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2">
                        <label for="us-tel">Telefone</label>
                        <input pInputText id="us-tel" formControlName="telefone" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="us-creci">CRECI</label>
                        <input pInputText id="us-creci" formControlName="creci" />
                    </div>
                </div>
                <fieldset class="border-0 p-0 m-0">
                    <legend class="mb-2">Papéis</legend>
                    <div class="flex flex-wrap gap-5">
                        <label class="flex items-center gap-2"><p-checkbox [binary]="true" [formControl]="form.controls.corretor" inputId="us-cor" /> Corretor</label>
                        <label class="flex items-center gap-2"><p-checkbox [binary]="true" [formControl]="form.controls.admin" inputId="us-adm" /> Administrador</label>
                    </div>
                    <p class="text-xs text-muted-color mt-2 mb-0">Todo usuário é cliente. Corretor também entra como cliente; administrador entra como admin, corretor e cliente.</p>
                </fieldset>
                <label class="flex items-center gap-2"><p-toggleswitch formControlName="ativo" inputId="us-ativo" /> Conta ativa</label>
                <div class="flex flex-col gap-2">
                    <label for="us-senha">{{ editando() ? 'Nova senha (deixe vazio para manter)' : 'Senha inicial' }}</label>
                    <p-password inputId="us-senha" formControlName="senha" [toggleMask]="true" [feedback]="false" [fluid]="true" autocomplete="new-password" />
                </div>
            </form>
            <ng-template #footer>
                <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="dialogo.set(false)" />
                <p-button label="Salvar" icon="pi pi-check" type="submit" form="form-usuario" [loading]="salvando()" />
            </ng-template>
        </p-dialog>
    `
})
export class UsuariosPage {
    private admin = inject(AdminService);
    private msg = inject(MessageService);
    private confirm = inject(ConfirmationService);
    private fb = inject(NonNullableFormBuilder);
    meuId = inject(AuthService).usuario()?.id;

    papeisOpcoes: { value: Perfil; label: string }[] = [
        { value: 'CLIENTE', label: 'Clientes' },
        { value: 'CORRETOR', label: 'Corretores' },
        { value: 'ADMIN', label: 'Administradores' }
    ];
    busca = new FormControl('');
    papel = new FormControl<Perfil | null>(null);

    pagina = signal<PageResponse<Usuario>>({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    carregando = signal(false);
    dialogo = signal(false);
    editando = signal<Usuario | null>(null);
    salvando = signal(false);
    private ultimo: TableLazyLoadEvent = { first: 0, rows: 20 };

    form = this.fb.group({
        nome: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        telefone: [''],
        creci: [''],
        corretor: [false],
        admin: [false],
        ativo: [true],
        senha: ['']
    });

    constructor() {
        inject(ConfigService).definirTitulo('Usuários');
        this.busca.valueChanges.pipe(debounceTime(350)).subscribe(() => this.carregar({ ...this.ultimo, first: 0 }));
        this.papel.valueChanges.subscribe(() => this.carregar({ ...this.ultimo, first: 0 }));
    }

    rotulo(p: Perfil) {
        return perfilLabel(p);
    }

    carregar(e: TableLazyLoadEvent) {
        this.ultimo = e;
        const rows = e.rows ?? 20;
        this.carregando.set(true);
        this.admin.usuarios(this.busca.value || null, this.papel.value, Math.floor((e.first ?? 0) / rows), rows).subscribe({
            next: (p) => {
                this.pagina.set(p);
                this.carregando.set(false);
            },
            error: (err) => {
                this.carregando.set(false);
                this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(err) });
            }
        });
    }

    abrir(u: Usuario | null) {
        this.editando.set(u);
        this.form.reset({
            nome: u?.nome ?? '',
            email: u?.email ?? '',
            telefone: u?.telefone ?? '',
            creci: u?.creci ?? '',
            corretor: !!u?.papeis.includes('CORRETOR'),
            admin: !!u?.papeis.includes('ADMIN'),
            ativo: u?.ativo ?? true,
            senha: ''
        });
        this.dialogo.set(true);
    }

    salvar() {
        const v = this.form.getRawValue();
        const u = this.editando();
        if (this.form.invalid || (!u && v.senha.length < 8) || (v.senha && v.senha.length < 8)) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Confira os dados', detail: 'Nome, e-mail válido e senha com pelo menos 8 caracteres.' });
            return;
        }
        const papeis: Perfil[] = ['CLIENTE'];
        if (v.corretor) papeis.push('CORRETOR');
        if (v.admin) papeis.push('ADMIN');
        const dto = { nome: v.nome, email: v.email, telefone: v.telefone || null, creci: v.creci || null, papeis, ativo: v.ativo, senha: v.senha || null };
        this.salvando.set(true);
        (u ? this.admin.atualizarUsuario(u.id, dto) : this.admin.criarUsuario(dto)).subscribe({
            next: () => {
                this.salvando.set(false);
                this.dialogo.set(false);
                this.msg.add({ severity: 'success', summary: 'Usuário salvo' });
                this.carregar(this.ultimo);
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }

    desativar(u: Usuario) {
        this.confirm.confirm({
            header: 'Desativar usuário',
            message: `${u.nome} não poderá mais entrar. Os anúncios e o histórico são mantidos.`,
            acceptButtonProps: { label: 'Desativar', severity: 'danger' },
            rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
            accept: () =>
                this.admin.desativarUsuario(u.id).subscribe({
                    next: () => this.carregar(this.ultimo),
                    error: (e) => this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(e) })
                })
        });
    }
}
