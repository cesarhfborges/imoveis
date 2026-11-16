import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from '@/app/core/services/auth.service';
import { TelefoneAnuncianteService } from '@/app/core/services/telefone-anunciante.service';
import { TelefonePipe, digitos } from '@/app/core/pipes/formatos';
import { TooltipModule } from 'primeng/tooltip';
import { Anunciante } from '@/app/core/models/models';

/**
 * Telefone do anunciante conforme Configurações > Regras:
 *  - MOSTRAR: número completo;
 *  - OCULTAR: a API não manda o número e nada aparece;
 *  - MOSTRAR_APENAS_LOGADO: logado vê o número completo direto; sem login aparece "(61) 99999-•••• [Ver]",
 *    e o botão leva para a página de entrar e volta para cá.
 * "variante": 'texto' é o cartão com o número; 'botao' é o atalho do celular ("Ver telefone" / "Ligar").
 * Instâncias do mesmo anúncio compartilham o número revelado (um clique revela em todos os lugares).
 */
@Component({
    selector: 'app-telefone-anunciante',
    imports: [TelefonePipe, TooltipModule],
    template: `
        @let num = numero();
        @if (anunciante()?.telefone) {
            @if (variante() === 'botao') {
                <!-- atalho do celular, ao lado de "Enviar mensagem" -->
                @if (num) {
                    <a [href]="'tel:' + num" class="botao-contorno justify-center"><i class="pi pi-phone" aria-hidden="true"></i> Ligar</a>
                } @else {
                    <button type="button" class="botao-contorno justify-center" [disabled]="carregando()" (click)="ver()" [attr.aria-label]="rotuloAcessivel()" [pTooltip]="dica()" tooltipPosition="top">
                        <i [class]="carregando() ? 'pi pi-spin pi-spinner' : auth.logado() ? 'pi pi-phone' : 'pi pi-lock'" aria-hidden="true"></i> Ver telefone
                    </button>
                }
            } @else {
                <div class="tel-anunciante">
                    <span class="tel-anunciante__icone" aria-hidden="true"><i class="pi pi-phone"></i></span>
                    <div class="tel-anunciante__texto" aria-live="polite">
                        <span class="tel-anunciante__rotulo">Telefone de contato</span>
                        <!-- número e botão "Ver" na mesma linha, alinhados pelo centro do número -->
                        <div class="tel-anunciante__linha">
                            @if (num) {
                                <!-- revelado: o próprio número é o link de ligar -->
                                <a class="tel-anunciante__numero" [href]="'tel:' + num" [attr.aria-label]="'Ligar para ' + (num | telefone)">{{ num | telefone }}</a>
                            } @else {
                                <span class="tel-anunciante__numero"><span aria-hidden="true">{{ parcial() }}</span><span class="sr-only">Número parcialmente oculto</span></span>
                                <button type="button" class="tel-anunciante__acao" [disabled]="carregando()" (click)="ver()" [attr.aria-label]="rotuloAcessivel()" [pTooltip]="dica()" tooltipPosition="top">
                                    <i [class]="carregando() ? 'pi pi-spin pi-spinner' : auth.logado() ? 'pi pi-eye' : 'pi pi-lock'" aria-hidden="true"></i> Ver
                                </button>
                            }
                        </div>
                    </div>
                </div>
                @if (!num && !auth.logado()) {
                    <p class="tel-anunciante__dica">Entre na sua conta para ver o número completo.</p>
                }
            }
        }
    `,
    styles: `
        .tel-anunciante {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            border: 1px solid var(--site-borda);
            border-radius: var(--site-raio);
            background: color-mix(in srgb, var(--p-primary-color), transparent 96%);
        }
        .tel-anunciante__icone {
            flex: none;
            display: grid;
            place-items: center;
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 999px;
            color: var(--p-primary-color);
            background: color-mix(in srgb, var(--p-primary-color), transparent 88%);
        }
        .tel-anunciante__texto {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            line-height: 1.25;
        }
        .tel-anunciante__linha {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
        }
        .tel-anunciante__rotulo {
            font-size: 0.75rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--p-text-muted-color);
        }
        .tel-anunciante__numero {
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--p-text-color);
            letter-spacing: 0.01em;
            white-space: nowrap;
            text-decoration: none;
        }
        a.tel-anunciante__numero:hover {
            color: var(--p-primary-color);
        }
        .tel-anunciante__acao {
            flex: none;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.25rem 0.7rem;
            border: 1px solid var(--p-primary-color);
            border-radius: var(--site-raio);
            background: var(--p-primary-color);
            color: var(--p-primary-contrast-color);
            font-size: 0.85rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            &:hover:not([disabled]) {
                background: var(--p-primary-hover-color);
                border-color: var(--p-primary-hover-color);
            }
            &:focus-visible {
                outline: 2px solid var(--p-primary-color);
                outline-offset: 2px;
            }
            &[disabled] {
                opacity: 0.7;
                cursor: progress;
            }
        }
        .tel-anunciante__dica {
            margin: 0.4rem 0 0;
            font-size: 0.75rem;
            color: var(--p-text-muted-color);
            text-align: center;
        }
    `
})
export class TelefoneAnunciante {
    imovelId = input.required<number>();
    anunciante = input<Anunciante | null>(null);
    variante = input<'texto' | 'botao'>('texto');

    protected auth = inject(AuthService);
    private router = inject(Router);
    private msg = inject(MessageService);
    private revelados = inject(TelefoneAnuncianteService);

    /** Número completo (só dígitos), se já veio completo ou já foi revelado. */
    numero = computed(() => {
        const a = this.anunciante();
        if (!a?.telefone) return null;
        // "!== false": API antiga (sem o campo) manda o número completo
        return a.telefoneCompleto !== false ? digitos(a.telefone) : this.revelados.numero(this.imovelId())();
    });
    carregando = computed(() => this.revelados.carregando(this.imovelId())());
    /** "6199999" → "(61) 99999-••••"; fixo "613333" → "(61) 3333-••••" */
    parcial = computed(() => {
        const d = digitos(this.anunciante()?.telefone);
        return d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}-••••` : d;
    });
    /** Tooltip do botão "Ver": avisa que o número completo é só para quem está logado. */
    dica = computed(() => (this.auth.logado() ? 'Mostrar o telefone completo' : 'Somente usuários logados podem ver o telefone. Clique para entrar.'));
    rotuloAcessivel = computed(() => (this.auth.logado() ? 'Ver telefone de contato completo' : 'Entrar na conta para ver o telefone de contato'));

    constructor() {
        // quem já está logado vê o número sem clicar: a API já manda completo; se a sessão abriu
        // com a página carregada (ou a resposta veio parcial), busca o número sozinho
        effect(() => {
            const a = this.anunciante();
            if (this.auth.logado() && a?.telefone && a.telefoneCompleto === false) {
                untracked(() => void this.ver());
            }
        });
    }

    async ver() {
        if (!this.auth.logado()) {
            this.irParaLogin();
            return;
        }
        try {
            await this.revelados.revelar(this.imovelId());
        } catch (e) {
            if (e instanceof HttpErrorResponse && e.status === 401) {
                this.irParaLogin();
                return;
            }
            this.msg.add({ severity: 'error', summary: 'Telefone', detail: 'Não foi possível mostrar o telefone agora.' });
        }
    }

    private irParaLogin() {
        this.router.navigate(['/conta/login'], { queryParams: { voltar: this.router.url } });
    }
}
