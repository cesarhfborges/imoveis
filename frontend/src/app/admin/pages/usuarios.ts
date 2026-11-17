import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputMaskModule } from 'primeng/inputmask';
import { PasswordModule } from 'primeng/password';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ConfirmationService, MessageService } from 'primeng/api';
import { debounceTime } from 'rxjs';
import { PageResponse, Perfil, TipoAnunciante, Usuario, perfilLabel } from '@/app/core/models/models';
import { digitos } from '@/app/core/pipes/formatos';
import { documentoValido, erroDocumento } from '@/app/core/pipes/documentos';
import { AdminService } from '@/app/core/services/conta.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { TelefoneInput } from '@/app/shared/components/telefone-input';

/** Usuários e permissões: papéis (cliente, corretor, administrador), ativação e senha. */
@Component({
    selector: 'app-usuarios-page',
    imports: [
        DatePipe,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        DialogModule,
        CheckboxModule,
        ToggleSwitchModule,
        PasswordModule,
        InputMaskModule,
        TagModule,
        TooltipModule,
        MessageModule,
        IconFieldModule,
        InputIconModule,
        PageHeader,
        TelefoneInput
    ],
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
                            <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" (onClick)="abrir(u)" [ariaLabel]="'Editar ' + u.nome" pTooltip="Editar dados, papéis e senha" tooltipPosition="top" />
                            @if (u.ativo && u.id !== meuId) {
                                <p-button icon="pi pi-ban" severity="danger" [text]="true" [rounded]="true" (onClick)="desativar(u)" [ariaLabel]="'Desativar ' + u.nome" pTooltip="Desativar conta (bloqueia o acesso)" tooltipPosition="top" />
                            }
                            @if (u.id !== meuId) {
                                <p-button
                                    icon="pi pi-trash"
                                    severity="danger"
                                    [text]="true"
                                    [rounded]="true"
                                    (onClick)="pedirExclusao(u)"
                                    [ariaLabel]="'Excluir definitivamente ' + u.nome"
                                    pTooltip="Excluir definitivamente e apagar os dados (LGPD)"
                                    tooltipPosition="top"
                                />
                            }
                        </td>
                    </tr>
                </ng-template>
            </p-table>
        </div>

        <p-dialog [blockScroll]="true" [visible]="dialogo()" (visibleChange)="dialogo.set($event)" [modal]="true" [header]="editando() ? 'Editar usuário' : 'Novo usuário'" [style]="{ width: '34rem' }" [breakpoints]="{ '575px': '95vw' }">
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
                        <app-telefone-input inputId="us-tel" formControlName="telefone" />
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
                @if (ehCorretor()) {
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label for="us-tipo">Tipo de usuário</label>
                            <p-select inputId="us-tipo" [options]="tiposAnunciante" optionLabel="label" optionValue="value" formControlName="tipoAnunciante" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="us-doc">{{ ehImobiliaria() ? 'CNPJ' : 'CPF' }}</label>
                            <p-inputmask
                                inputId="us-doc"
                                formControlName="documento"
                                [mask]="ehImobiliaria() ? '99.999.999/9999-99' : '999.999.999-99'"
                                [unmask]="true"
                                [autoClear]="false"
                                inputmode="numeric"
                                [fluid]="true"
                                [invalid]="docInvalido()"
                                [attr.aria-describedby]="docInvalido() ? 'us-doc-erro' : null"
                            />
                            @if (docInvalido()) {
                                <small id="us-doc-erro" class="text-red-600 dark:text-red-400">{{ erroDoc() }}</small>
                            }
                        </div>
                    </div>
                }
                <label class="flex items-center gap-2"><p-toggleswitch formControlName="ativo" inputId="us-ativo" /> Conta ativa</label>
                <div class="flex flex-col gap-2">
                    <label for="us-senha">{{ editando() ? 'Nova senha (deixe vazio para manter)' : 'Senha inicial' }}</label>
                    <p-password inputId="us-senha" formControlName="senha" [toggleMask]="true" [feedback]="false" [fluid]="true" autocomplete="new-password" />
                </div>
            </form>
            <ng-template #footer>
                <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="dialogo.set(false)" />
                <p-button label="Salvar" icon="pi pi-check" (onClick)="salvar()" [loading]="salvando()" />
            </ng-template>
        </p-dialog>

        <p-dialog [blockScroll]="true" [visible]="!!excluindo()" (visibleChange)="!$event && fecharExclusao()" [modal]="true" header="Excluir usuário definitivamente" [style]="{ width: '34rem' }" [breakpoints]="{ '575px': '95vw' }">
            @if (excluindo(); as u) {
                <div class="flex flex-col gap-4">
                    <p-message severity="error" icon="pi pi-exclamation-triangle">Esta ação não pode ser desfeita.</p-message>
                    <p class="m-0">
                        Vão ser apagados a conta de <strong>{{ u.nome }}</strong> e todos os dados dela: anúncios (com fotos, contatos recebidos e denúncias), contatos enviados, favoritos, tokens de API, notificações, aceites de termos, foto e capa
                        do perfil.
                    </p>
                    <p class="m-0 text-sm text-muted-color">
                        As denúncias que a pessoa fez contra anúncios de outros continuam no histórico de moderação, sem identificar quem denunciou. Para só bloquear o acesso e manter os dados, use <strong>Desativar</strong>.
                    </p>
                    <div class="flex flex-col gap-2">
                        <label for="us-exc-email"
                            >Para confirmar, digite o e-mail <strong>{{ u.email }}</strong></label
                        >
                        <input pInputText id="us-exc-email" type="email" autocomplete="off" [value]="confirmacaoExclusao()" (input)="confirmacaoExclusao.set($any($event.target).value)" />
                    </div>
                </div>
            }
            <ng-template #footer>
                <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="fecharExclusao()" />
                <p-button label="Excluir definitivamente" icon="pi pi-trash" severity="danger" [disabled]="!podeExcluir()" [loading]="apagando()" (onClick)="excluirDefinitivo()" />
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
    /** Usuário na confirmação de exclusão definitiva (LGPD). */
    excluindo = signal<Usuario | null>(null);
    confirmacaoExclusao = signal('');
    apagando = signal(false);
    /** Só libera o botão com o e-mail digitado igual ao da conta. */
    podeExcluir = computed(() => !!this.excluindo() && this.confirmacaoExclusao().trim().toLowerCase() === this.excluindo()!.email.toLowerCase());
    private ultimo: TableLazyLoadEvent = { first: 0, rows: 20 };

    form = this.fb.group({
        nome: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        telefone: [''],
        creci: [''],
        corretor: [false],
        admin: [false],
        ativo: [true],
        senha: [''],
        tipoAnunciante: this.fb.control<TipoAnunciante>('CORRETOR'),
        documento: ['', (c: AbstractControl) => this.validarDocumento(c)]
    });

    tiposAnunciante: { value: TipoAnunciante; label: string }[] = [
        { value: 'CORRETOR', label: 'Corretor (CPF)' },
        { value: 'IMOBILIARIA', label: 'Imobiliária (CNPJ)' }
    ];
    private valores = toSignal(this.form.valueChanges);
    /** CPF/CNPJ e tipo de anunciante valem para quem tem o papel de corretor. */
    ehCorretor = computed(() => (this.valores(), this.form.controls.corretor.value));
    ehImobiliaria = computed(() => (this.valores(), this.form.controls.tipoAnunciante.value === 'IMOBILIARIA'));

    constructor() {
        inject(ConfigService).definirTitulo('Usuários');
        // CPF e CNPJ têm máscaras de tamanhos diferentes: ao trocar o tipo, o campo começa do zero
        this.form.controls.tipoAnunciante.valueChanges.subscribe(() => {
            const doc = this.form.controls.documento;
            if (this.form.controls.tipoAnunciante.dirty) doc.reset('');
            doc.updateValueAndValidity();
        });
        this.busca.valueChanges.pipe(debounceTime(350)).subscribe(() => this.carregar({ ...this.ultimo, first: 0 }));
        this.papel.valueChanges.subscribe(() => this.carregar({ ...this.ultimo, first: 0 }));
    }

    /** Opcional (vazio apaga); o gravado sem mudança não é revalidado. */
    private validarDocumento(c: AbstractControl): ValidationErrors | null {
        const d = digitos(c.value);
        if (!d || !this.form) return null;
        const tipo = this.form.controls.tipoAnunciante.value;
        const u = this.editando();
        if (u && d === u.documento && tipo === (u.tipoAnunciante ?? 'CORRETOR')) return null;
        const imobiliaria = tipo === 'IMOBILIARIA';
        if (d.length < (imobiliaria ? 14 : 11)) return { incompleto: true };
        return documentoValido(d, imobiliaria) ? null : { documento: true };
    }

    docInvalido() {
        const c = this.form.controls.documento;
        return c.invalid && (c.touched || c.dirty);
    }

    erroDoc() {
        return erroDocumento(this.form.controls.documento.errors, this.ehImobiliaria());
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
            senha: '',
            tipoAnunciante: u?.tipoAnunciante === 'IMOBILIARIA' ? 'IMOBILIARIA' : 'CORRETOR',
            documento: u?.documento ?? ''
        });
        this.dialogo.set(true);
    }

    salvar() {
        const v = this.form.getRawValue();
        const u = this.editando();
        const c = this.form.controls;
        // CPF/CNPJ só conta para corretor (sem o papel, o campo nem aparece e não é enviado)
        const docInvalido = v.corretor && c.documento.invalid;
        if (c.nome.invalid || c.email.invalid || docInvalido || (!u && v.senha.length < 8) || (v.senha && v.senha.length < 8)) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Confira os dados', detail: docInvalido ? (this.erroDoc() ?? '') : 'Nome, e-mail válido e senha com pelo menos 8 caracteres.' });
            return;
        }
        const papeis: Perfil[] = ['CLIENTE'];
        if (v.corretor) papeis.push('CORRETOR');
        if (v.admin) papeis.push('ADMIN');
        const dto = {
            nome: v.nome,
            email: v.email,
            telefone: v.telefone || null,
            creci: v.creci || null,
            papeis,
            ativo: v.ativo,
            senha: v.senha || null,
            tipoAnunciante: v.corretor ? v.tipoAnunciante : null,
            documento: v.corretor ? digitos(v.documento) || null : null
        };
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

    pedirExclusao(u: Usuario) {
        this.confirmacaoExclusao.set('');
        this.excluindo.set(u);
    }

    fecharExclusao() {
        if (!this.apagando()) this.excluindo.set(null);
    }

    excluirDefinitivo() {
        const u = this.excluindo();
        if (!u || !this.podeExcluir()) return;
        this.apagando.set(true);
        this.admin.excluirUsuarioDefinitivo(u.id).subscribe({
            next: () => {
                this.apagando.set(false);
                this.excluindo.set(null);
                this.msg.add({ severity: 'success', summary: 'Usuário excluído', detail: `A conta de ${u.nome} e os dados dela foram apagados.` });
                this.carregar(this.ultimo);
            },
            error: (e) => {
                this.apagando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível excluir', detail: mensagemErro(e) });
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
