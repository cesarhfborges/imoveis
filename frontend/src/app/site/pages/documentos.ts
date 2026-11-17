import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { tipoDocumentoInfo } from '@/app/core/models/models';
import { DocumentoService } from '@/app/core/services/documento.service';
import { ConfigService } from '@/app/core/services/config.service';

/** Central de documentos (/documentos): termos de uso, privacidade, código de conduta… para leitura livre. */
@Component({
    selector: 'app-documentos-page',
    imports: [DatePipe, RouterLink],
    template: `
        <section class="site-container secao">
            <header class="mb-8 max-w-3xl">
                <span class="inline-flex items-center gap-2 text-sm font-semibold text-primary"><i class="pi pi-book" aria-hidden="true"></i> Central de documentos</span>
                <h1 class="text-3xl font-bold mt-2 mb-3">Termos, privacidade e regras do portal</h1>
                <div class="text-muted-color text-lg">Tudo o que você precisa saber sobre o uso do {{ cfg().nomeApp }}, a proteção dos seus dados e as regras de convivência. Leitura livre, sem precisar de conta.</div>
            </header>

            @if (documentos.publicos().length) {
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    @for (d of documentos.publicos(); track d.id) {
                        @let tipo = info(d.tipo);
                        <a [routerLink]="['/documentos', d.slug]" class="group flex flex-col gap-3 p-5 rounded-border border border-surface bg-surface-0 dark:bg-surface-900 hover:border-primary hover:shadow-md transition-all">
                            <span class="flex items-center justify-center w-11 h-11 rounded-border bg-primary-50 dark:bg-primary-400/10 text-primary"><i class="pi {{ tipo.icone }}" aria-hidden="true"></i></span>
                            <span class="text-lg font-semibold text-color group-hover:text-primary">{{ d.titulo }}</span>
                            @if (d.resumo) {
                                <span class="text-sm text-muted-color">{{ d.resumo }}</span>
                            }
                            <span class="mt-auto pt-2 flex items-center justify-between text-xs text-muted-color">
                                <span>Versão {{ d.versao }} · atualizado em {{ d.versaoEm | date: 'dd/MM/yyyy' }}</span>
                                <i class="pi pi-arrow-right text-primary transition-transform group-hover:translate-x-1" aria-hidden="true"></i>
                            </span>
                        </a>
                    }
                </div>
            } @else {
                <div class="text-muted-color">Nenhum documento publicado no momento.</div>
            }
        </section>
    `
})
export class DocumentosPage {
    documentos = inject(DocumentoService);
    cfg = inject(ConfigService).config;

    constructor() {
        inject(ConfigService).definirTitulo('Documentos');
        this.documentos.carregarPublicos(true);
    }

    info(t: Parameters<typeof tipoDocumentoInfo>[0]) {
        return tipoDocumentoInfo(t);
    }
}
