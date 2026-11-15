import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MensagemDenuncia } from '@/app/core/models/models';
import { Avatar } from './avatar';

/**
 * Linha do tempo de uma denúncia: mensagens da moderação e do anunciante (com o avatar de cada um: a foto de
 * perfil ou as iniciais) e os registros do sistema. As mensagens de quem está vendo ficam à direita.
 */
@Component({
    selector: 'app-conversa-denuncia',
    imports: [DatePipe, Avatar],
    template: `
        <ol class="conversa" aria-label="Conversa da denúncia">
            @for (m of mensagens(); track m.id) {
                @if (m.papel === 'SISTEMA') {
                    <li class="conversa__sistema">
                        <i class="pi pi-info-circle" aria-hidden="true"></i>
                        <span>{{ m.texto }}</span>
                        <time [attr.datetime]="m.criadoEm">{{ m.criadoEm | date: 'dd/MM HH:mm' }}</time>
                    </li>
                } @else {
                    <li class="conversa__linha" [class.conversa__linha--minha]="minha(m)">
                        <app-avatar class="conversa__avatar" [nome]="m.autor" [foto]="m.autorFoto" [icone]="moderacaoAnonima(m) ? 'pi-shield' : null" [tom]="moderacaoAnonima(m) ? 'moderacao' : 'primario'" tamanho="2.25rem" />
                        <div class="conversa__msg" [class.conversa__msg--minha]="minha(m)" [class.conversa__msg--interna]="m.interna">
                            <div class="conversa__cabeca">
                                <strong>{{ m.autor }}</strong>
                                <span class="conversa__papel">{{ m.interna ? 'Nota interna' : m.papel === 'ADMIN' ? 'Moderação' : 'Anunciante' }}</span>
                                <time [attr.datetime]="m.criadoEm">{{ m.criadoEm | date: 'dd/MM/yy HH:mm' }}</time>
                            </div>
                            <div class="conversa__texto" [innerHTML]="html(m.texto)"></div>
                            @if (m.anexos.length) {
                                <ul class="conversa__anexos" aria-label="Anexos">
                                    @for (a of m.anexos; track a; let i = $index) {
                                        <li>
                                            @if (ehPdf(a)) {
                                                <a [href]="a" target="_blank" rel="noopener" class="conversa__pdf"><i class="pi pi-file-pdf" aria-hidden="true"></i> PDF {{ i + 1 }}<span class="sr-only"> (abre em nova aba)</span></a>
                                            } @else {
                                                <a [href]="a" target="_blank" rel="noopener" class="conversa__foto" [attr.aria-label]="'Foto anexada ' + (i + 1) + ' (abre em nova aba)'">
                                                    <img [src]="a" alt="" loading="lazy" />
                                                </a>
                                            }
                                        </li>
                                    }
                                </ul>
                            }
                        </div>
                    </li>
                }
            } @empty {
                <li class="text-muted-color text-sm">Nenhuma mensagem ainda.</li>
            }
        </ol>
    `,
    styles: `
        .conversa {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 0.85rem;
        }
        .conversa__sistema {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 0.4rem;
            font-size: 0.8rem;
            color: var(--p-text-muted-color);
            padding: 0 0.25rem;
        }
        .conversa__sistema time {
            margin-left: auto;
        }
        .conversa__linha {
            display: flex;
            align-items: flex-end;
            gap: 0.6rem;
            max-width: 88%;
            align-self: flex-start;
        }
        .conversa__linha--minha {
            flex-direction: row-reverse;
            align-self: flex-end;
        }
        .conversa__avatar {
            box-shadow: 0 0 0 2px var(--p-content-background);
        }
        .conversa__msg {
            min-width: 0;
            padding: 0.7rem 0.9rem;
            border-radius: 14px 14px 14px 4px;
            border: 1px solid var(--p-content-border-color);
            background: var(--p-content-background);
        }
        .conversa__msg--minha {
            border-radius: 14px 14px 4px 14px;
            background: color-mix(in srgb, var(--p-primary-color), transparent 90%);
            border-color: color-mix(in srgb, var(--p-primary-color), transparent 70%);
        }
        .conversa__msg--interna {
            background: color-mix(in srgb, var(--p-yellow-400), transparent 82%);
            border-style: dashed;
            border-color: var(--p-yellow-600);
        }
        .conversa__cabeca {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 0.5rem;
            font-size: 0.8rem;
            margin-bottom: 0.25rem;
        }
        .conversa__papel {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--p-text-muted-color);
        }
        .conversa__cabeca time {
            color: var(--p-text-muted-color);
        }
        .conversa__texto {
            line-height: 1.5;
            overflow-wrap: anywhere;
        }
        .conversa__texto :is(p, ol, ul, blockquote) {
            margin: 0 0 0.4rem;
        }
        .conversa__texto > :last-child {
            margin-bottom: 0;
        }
        .conversa__texto :is(ol, ul) {
            padding-left: 1.4rem;
        }
        /* listas do Quill 2: <ol><li data-list="bullet"> */
        .conversa__texto li[data-list='bullet'] {
            list-style-type: disc;
        }
        .conversa__texto blockquote {
            border-left: 3px solid var(--p-content-border-color);
            padding-left: 0.75rem;
            color: var(--p-text-muted-color);
        }
        .conversa__texto a {
            color: var(--p-primary-color);
            text-decoration: underline;
        }
        .conversa__foto {
            display: block;
            width: 5.5rem;
            height: 4.25rem;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--p-content-border-color);
        }
        .conversa__foto img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .conversa__pdf {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.35rem 0.6rem;
            border-radius: 8px;
            border: 1px solid var(--p-content-border-color);
        }
        .conversa__pdf i {
            color: var(--p-red-600);
        }
        .conversa__anexos {
            list-style: none;
            margin: 0.4rem 0 0;
            padding: 0;
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            font-size: 0.85rem;
        }
        .conversa__anexos a {
            color: var(--p-primary-color);
        }
        @media (max-width: 575px) {
            .conversa__linha {
                max-width: 100%;
            }
        }
    `
})
export class ConversaDenuncia {
    mensagens = input.required<MensagemDenuncia[]>();
    /** Quem está vendo: as mensagens dele ficam à direita. */
    visao = input<'admin' | 'anunciante'>('anunciante');

    minha(m: MensagemDenuncia) {
        return this.visao() === 'admin' ? m.papel === 'ADMIN' : m.papel === 'ANUNCIANTE';
    }

    /** Mensagens antigas (texto simples) viram parágrafos; as do editor já vêm em HTML limpo pelo servidor. */
    html(texto: string) {
        if (texto.trimStart().startsWith('<')) return texto;
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    ehPdf(url: string) {
        return url.toLowerCase().endsWith('.pdf');
    }

    /** Para o anunciante a moderação não tem nome nem foto: aparece com o escudo. */
    moderacaoAnonima(m: MensagemDenuncia) {
        return m.papel === 'ADMIN' && this.visao() === 'anunciante';
    }
}
