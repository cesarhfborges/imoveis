import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DocumentoAdmin, PERFIS_ACEITE, tipoDocumentoInfo } from '@/app/core/models/models';
import { DocumentoService } from '@/app/core/services/documento.service';
import { mensagemErro } from '@/app/core/services/api.service';

/** Aba "Documentos" de /admin/configuracoes: termos, privacidade, código de conduta… */
@Component({
    selector: 'app-documentos-lista',
    imports: [DatePipe, FormsModule, RouterLink, ButtonModule, TagModule, ToggleSwitchModule, TooltipModule],
    template: `
        <div class="flex flex-col gap-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 class="text-base font-semibold m-0 flex items-center gap-2"><i class="pi pi-book text-primary" aria-hidden="true"></i> Documentos do site</h3>
                    <p class="text-sm text-muted-color mt-1 mb-0">Termos de uso, política de privacidade (LGPD), código de conduta e outros. Os públicos ficam em <a href="/documentos" target="_blank" class="text-primary hover:underline">/documentos</a>.</p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    <label class="flex items-center gap-2 text-sm cursor-pointer" for="doc-excluidos">
                        <p-toggleswitch inputId="doc-excluidos" [ngModel]="mostrarExcluidos()" (ngModelChange)="mostrarExcluidos.set($event); carregar()" [ngModelOptions]="{ standalone: true }" />
                        Mostrar excluídos
                    </label>
                    <a routerLink="/admin/documentos/novo" class="p-button gap-2"><i class="pi pi-plus" aria-hidden="true"></i> Novo documento</a>
                </div>
            </div>

            @for (d of lista(); track d.id) {
                @let tipo = info(d.tipo);
                <article class="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-border border border-surface" [class.opacity-60]="!!d.excluidoEm" [attr.aria-label]="d.titulo">
                    <span class="flex items-center justify-center w-11 h-11 rounded-border shrink-0" [class]="d.ativo ? 'bg-primary-50 dark:bg-primary-400/10 text-primary' : 'bg-surface-100 dark:bg-surface-800 text-muted-color'">
                        <i class="pi {{ tipo.icone }}" aria-hidden="true"></i>
                    </span>
                    <div class="min-w-0 grow flex flex-col gap-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <a [routerLink]="['/admin/documentos', d.id]" class="font-semibold text-color hover:text-primary hover:underline">{{ d.titulo }}</a>
                            @if (d.excluidoEm) {
                                <p-tag value="Excluído" severity="danger" />
                            } @else {
                                <p-tag [value]="d.ativo ? 'Ativo' : 'Inativo'" [severity]="d.ativo ? 'success' : 'secondary'" />
                            }
                            <span class="text-xs text-muted-color">{{ tipo.label }} · versão {{ d.versao }} · /documentos/{{ d.slug }}</span>
                        </div>
                        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-color">
                            <span><i class="pi" [class]="d.publico ? 'pi-eye' : 'pi-eye-slash'" aria-hidden="true"></i> {{ d.publico ? 'Na central pública' : 'Fora da central' }}</span>
                            @if (d.aceiteCadastro) {
                                <span><i class="pi pi-user-plus" aria-hidden="true"></i> Aceite no cadastro</span>
                            }
                            @if (d.aceiteContas) {
                                <span><i class="pi pi-lock" aria-hidden="true"></i> Aceite obrigatório de quem já tem conta</span>
                            }
                            @if (d.aceiteCadastro || d.aceiteContas) {
                                <span><i class="pi pi-users" aria-hidden="true"></i> {{ perfil(d) }} · {{ d.aceitesVersaoAtual }} aceite(s) da versão atual</span>
                            }
                            <span><i class="pi pi-history" aria-hidden="true"></i> Atualizado em {{ d.atualizadoEm | date: 'dd/MM/yyyy HH:mm' }}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        @if (d.excluidoEm) {
                            <p-button label="Restaurar" icon="pi pi-replay" size="small" [outlined]="true" (onClick)="restaurar(d)" />
                        } @else {
                            <label class="flex items-center gap-2 text-sm mr-2 cursor-pointer" [for]="'doc-ativo-' + d.id">
                                <p-toggleswitch [inputId]="'doc-ativo-' + d.id" [ngModel]="d.ativo" (ngModelChange)="alternar(d, $event)" [ngModelOptions]="{ standalone: true }" />
                                <span class="sr-only">{{ d.ativo ? 'Desativar' : 'Ativar' }} {{ d.titulo }}</span>
                            </label>
                            @if (d.ativo) {
                                <a [href]="'/documentos/' + d.slug" target="_blank" rel="noopener" class="p-button p-button-text p-button-rounded p-button-icon-only" [attr.aria-label]="'Ver ' + d.titulo + ' no site'" pTooltip="Ver no site"><i class="pi pi-external-link" aria-hidden="true"></i></a>
                            }
                            <a [routerLink]="['/admin/documentos', d.id]" class="p-button p-button-text p-button-rounded p-button-icon-only" [attr.aria-label]="'Editar ' + d.titulo" pTooltip="Editar"><i class="pi pi-pencil" aria-hidden="true"></i></a>
                            <p-button icon="pi pi-trash" severity="danger" [text]="true" [rounded]="true" (onClick)="excluir(d)" [ariaLabel]="'Excluir ' + d.titulo" pTooltip="Excluir" />
                        }
                    </div>
                </article>
            } @empty {
                <p class="text-muted-color m-0">{{ carregando() ? 'Carregando…' : 'Nenhum documento cadastrado.' }}</p>
            }
        </div>
    `
})
export class DocumentosLista {
    private documentos = inject(DocumentoService);
    private msg = inject(MessageService);
    private confirm = inject(ConfirmationService);

    lista = signal<DocumentoAdmin[]>([]);
    carregando = signal(true);
    mostrarExcluidos = signal(false);

    constructor() {
        this.carregar();
    }

    info(t: DocumentoAdmin['tipo']) {
        return tipoDocumentoInfo(t);
    }

    perfil(d: DocumentoAdmin) {
        return PERFIS_ACEITE.find((p) => p.value === d.aceitePerfil)?.label ?? '';
    }

    carregar() {
        this.carregando.set(true);
        this.documentos.listarAdmin(this.mostrarExcluidos()).subscribe({
            next: (l) => {
                this.lista.set(l);
                this.carregando.set(false);
            },
            error: () => this.carregando.set(false)
        });
    }

    private trocar(d: DocumentoAdmin) {
        this.lista.update((l) => l.map((x) => (x.id === d.id ? d : x)));
    }

    alternar(d: DocumentoAdmin, ativo: boolean) {
        const aplicar = () =>
            this.documentos.situacao(d.id, ativo).subscribe({
                next: (novo) => {
                    this.trocar(novo);
                    this.msg.add({ severity: 'success', summary: ativo ? 'Documento ativado' : 'Documento desativado', detail: d.titulo });
                },
                error: (e) => {
                    this.trocar({ ...d });
                    this.msg.add({ severity: 'error', summary: 'Não foi possível alterar', detail: mensagemErro(e) });
                }
            });
        if (ativo && d.aceiteContas) {
            this.confirm.confirm({
                header: 'Ativar documento',
                message: `Ao ativar "${d.titulo}", quem já tem conta${d.aceitePerfil === 'TODOS' ? '' : ' (' + this.perfil(d).toLowerCase() + ')'} vai precisar aceitar a versão ${d.versao} para continuar usando o site. Continuar?`,
                acceptButtonProps: { label: 'Ativar' },
                rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
                accept: aplicar,
                reject: () => this.trocar({ ...d })
            });
        } else {
            aplicar();
        }
    }

    excluir(d: DocumentoAdmin) {
        this.confirm.confirm({
            header: 'Excluir documento',
            message: `"${d.titulo}" sai do site e do painel e deixa de exigir aceite. O histórico de versões e os aceites já registrados ficam guardados, e dá para restaurar depois em "Mostrar excluídos". Continuar?`,
            acceptButtonProps: { label: 'Excluir', severity: 'danger' },
            rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
            accept: () =>
                this.documentos.excluir(d.id).subscribe({
                    next: () => {
                        this.msg.add({ severity: 'success', summary: 'Documento excluído', detail: d.titulo });
                        this.carregar();
                    },
                    error: (e) => this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(e) })
                })
        });
    }

    restaurar(d: DocumentoAdmin) {
        this.documentos.restaurar(d.id).subscribe({
            next: () => {
                this.msg.add({ severity: 'success', summary: 'Documento restaurado', detail: 'Ele volta desativado: revise e ative quando quiser.' });
                this.carregar();
            },
            error: (e) => this.msg.add({ severity: 'error', summary: 'Não foi possível restaurar', detail: mensagemErro(e) })
        });
    }
}
