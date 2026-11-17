import { Component, inject, input, model, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { Visita } from '@/app/core/models/models';
import { AuthService } from '@/app/core/services/auth.service';
import { VisitaService } from '@/app/core/services/visita.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { SeletorHorario } from './seletor-horario';

/** Diálogo "Agendar visita" da página do imóvel (só para quem está logado: o pedido fica em Minhas visitas). */
@Component({
    selector: 'app-agendar-visita',
    imports: [DatePipe, FormsModule, RouterLink, ButtonModule, DialogModule, TextareaModule, SeletorHorario],
    template: `
        <p-dialog [blockScroll]="true" [visible]="visivel()" (visibleChange)="!$event && fechar()" [modal]="true" header="Agendar visita" [style]="{ width: '36rem' }" [breakpoints]="{ '640px': '96vw' }">
            @if (!auth.logado()) {
                <div class="flex flex-col items-center text-center gap-3 py-4">
                    <i class="pi pi-calendar-plus text-4xl text-primary" aria-hidden="true"></i>
                    <p class="m-0">Entre na sua conta para escolher um horário. O anunciante confirma pelo site e você acompanha em <strong>Minhas visitas</strong>.</p>
                    <p-button label="Entrar ou criar conta" icon="pi pi-sign-in" (onClick)="entrar()" />
                </div>
            } @else if (pedido(); as v) {
                <div class="flex flex-col items-center text-center gap-3 py-4" role="status">
                    <i class="pi pi-check-circle text-4xl text-green-600" aria-hidden="true"></i>
                    <p class="m-0 text-lg font-semibold">Pedido enviado</p>
                    <p class="m-0">{{ v.inicio | date: "EEEE, dd/MM 'às' HH:mm" }}. Você recebe um aviso quando o anunciante responder.</p>
                    <a routerLink="/conta/visitas" class="p-button p-button-outlined" (click)="fechar()">Ver minhas visitas</a>
                </div>
            } @else {
                <div class="flex flex-col gap-4">
                    <p class="m-0 text-sm text-muted-color">Escolha um horário. Cada visita dura cerca de 1 hora, e o anunciante confirma ou sugere outro horário.</p>
                    <app-seletor-horario [imovelId]="imovelId()" rotuloId="agendar" [(selecionado)]="horario" />
                    <div class="flex flex-col gap-2">
                        <label for="agendar-msg" class="font-medium">Recado para o anunciante <span class="text-muted-color font-normal">(opcional)</span></label>
                        <textarea pTextarea id="agendar-msg" rows="2" maxlength="1000" [(ngModel)]="mensagem" placeholder="Ex.: vou com minha família; tenho interesse em financiar"></textarea>
                    </div>
                </div>
            }
            <ng-template #footer>
                @if (auth.logado() && !pedido()) {
                    <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="fechar()" />
                    <p-button label="Pedir visita" icon="pi pi-calendar-plus" [disabled]="!horario()" [loading]="enviando()" (onClick)="enviar()" />
                }
            </ng-template>
        </p-dialog>
    `
})
export class AgendarVisita {
    auth = inject(AuthService);
    private visitas = inject(VisitaService);
    private msg = inject(MessageService);
    private router = inject(Router);

    imovelId = input.required<number>();
    visivel = model(false);

    horario = signal<string | null>(null);
    mensagem = '';
    enviando = signal(false);
    pedido = signal<Visita | null>(null);

    fechar() {
        this.visivel.set(false);
        this.horario.set(null);
        this.mensagem = '';
        this.pedido.set(null);
    }

    entrar() {
        this.router.navigate(['/conta/login'], { queryParams: { voltar: this.router.url } });
    }

    enviar() {
        const inicio = this.horario();
        if (!inicio) return;
        this.enviando.set(true);
        this.visitas.pedir(this.imovelId(), inicio, this.mensagem.trim() || null).subscribe({
            next: (v) => {
                this.enviando.set(false);
                this.pedido.set(v);
            },
            error: (e) => {
                this.enviando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível agendar', detail: mensagemErro(e) });
            }
        });
    }
}
