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
                    @let e = evento(m.texto);
                    <li class="conversa__sistema" [class]="'conversa__sistema conversa__sistema--' + e.tom" [class.conversa__sistema--interna]="m.interna">
                        <span class="conversa__sistema-icone" aria-hidden="true"><i class="pi {{ e.icone }}"></i></span>
                        <div class="min-w-0 flex-1">
                            <div class="conversa__sistema-cabeca">
                                <strong>{{ m.interna ? 'Registro interno' : 'Registro do sistema' }}</strong>
                                <time [attr.datetime]="m.criadoEm">{{ m.criadoEm | date: "dd/MM/yy 'às' HH:mm" }}</time>
                            </div>
                            <p class="conversa__sistema-texto">{{ m.texto }}</p>
                            @if (m.alteracoes.length) {
                                <table class="conversa__alteracoes">
                                    <caption class="sr-only">
                                        Alterações feitas no anúncio
                                    </caption>
                                    <thead>
                                        <tr>
                                            <th scope="col">Campo</th>
                                            <th scope="col">Antes</th>
                                            <th scope="col">Depois</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @for (a of m.alteracoes; track a.campo) {
                                            <tr>
                                                <th scope="row">{{ a.campo }}</th>
                                                <td class="conversa__antes" data-rotulo="Antes">
                                                    @if (a.antes) {
                                                        <del><span class="sr-only">Antes: </span>{{ a.antes }}</del>
                                                    } @else {
                                                        <span class="text-muted-color">não informado</span>
                                                    }
                                                </td>
                                                <td class="conversa__depois" data-rotulo="Depois">
                                                    @if (a.depois) {
                                                        <ins><span class="sr-only">Depois: </span>{{ a.depois }}</ins>
                                                    } @else {
                                                        <span class="text-muted-color">removido</span>
                                                    }
                                                </td>
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            }
                        </div>
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
        /* registros do sistema (julgamento, prazos, anúncio suspenso/reativado…): faixa de largura total */
        .conversa__sistema {
            --tom: var(--p-primary-color);
            display: flex;
            align-items: flex-start;
            gap: 0.65rem;
            padding: 0.6rem 0.8rem;
            border-radius: 10px;
            border: 1px solid color-mix(in srgb, var(--tom), transparent 65%);
            background: color-mix(in srgb, var(--tom), transparent 92%);
            font-size: 0.9rem;
        }
        .conversa__sistema--ok {
            --tom: var(--p-green-600);
        }
        .conversa__sistema--alerta {
            --tom: var(--p-orange-500);
        }
        .conversa__sistema--perigo {
            --tom: var(--p-red-600);
        }
        .conversa__sistema--info {
            --tom: var(--p-surface-500);
        }
        .conversa__sistema--interna {
            border-style: dashed;
        }
        .conversa__sistema-icone {
            flex-shrink: 0;
            width: 1.75rem;
            height: 1.75rem;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            background: var(--tom);
            font-size: 0.85rem;
        }
        .conversa__sistema-cabeca {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 0.5rem;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--p-text-muted-color);
        }
        .conversa__sistema-cabeca strong {
            font-weight: 600;
        }
        .conversa__sistema-cabeca time {
            margin-left: auto;
            text-transform: none;
            letter-spacing: 0;
        }
        .conversa__sistema--edicao {
            --tom: var(--p-primary-color);
        }
        .conversa__alteracoes {
            width: 100%;
            margin-top: 0.6rem;
            border-collapse: collapse;
            font-size: 0.85rem;
            background: var(--p-content-background);
            border-radius: 8px;
            overflow: hidden;
        }
        .conversa__alteracoes :is(th, td) {
            padding: 0.45rem 0.6rem;
            text-align: left;
            vertical-align: top;
            border-bottom: 1px solid var(--p-content-border-color);
            overflow-wrap: anywhere;
            white-space: pre-line;
        }
        .conversa__alteracoes tr:last-child :is(th, td) {
            border-bottom: 0;
        }
        .conversa__alteracoes thead th {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--p-text-muted-color);
            font-weight: 600;
        }
        .conversa__alteracoes tbody th {
            font-weight: 600;
            width: 9rem;
        }
        .conversa__alteracoes del {
            color: var(--p-red-700);
            text-decoration-thickness: 1px;
        }
        .conversa__alteracoes ins {
            color: var(--p-green-700);
            text-decoration: none;
            font-weight: 600;
        }
        :host-context(.app-dark) .conversa__alteracoes del {
            color: var(--p-red-300);
        }
        :host-context(.app-dark) .conversa__alteracoes ins {
            color: var(--p-green-300);
        }
        /* no celular, cada alteração vira um bloco: campo em cima, antes e depois embaixo */
        @media (max-width: 575px) {
            .conversa__alteracoes thead {
                display: none;
            }
            .conversa__alteracoes tr {
                display: block;
                padding: 0.4rem 0;
                border-bottom: 1px solid var(--p-content-border-color);
            }
            .conversa__alteracoes :is(th, td) {
                display: block;
                border: 0;
                padding: 0.15rem 0.6rem;
            }
            .conversa__alteracoes td::before {
                content: attr(data-rotulo) ': ';
                color: var(--p-text-muted-color);
            }
        }
        .conversa__sistema-texto {
            margin: 0.15rem 0 0;
            line-height: 1.45;
            color: var(--p-text-color);
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

    /** Cor e ícone do registro do sistema, pelo assunto do texto (gerado pelo servidor). */
    evento(texto: string): { tom: 'ok' | 'alerta' | 'perigo' | 'info' | 'edicao'; icone: string } {
        const t = texto.toLowerCase();
        if (t.startsWith('anúncio editado')) return { tom: 'edicao', icone: 'pi-pencil' };
        // pelo começo do texto: "Correção aceita… encerrada como procedente" é boa notícia, mas cita "procedente"
        if (/^(correção aceita|solução aprovada|anúncio de volta|anúncio reativado|conta do anunciante reativada|denúncia julgada improcedente)/.test(t)) {
            return { tom: 'ok', icone: 'pi-check' };
        }
        if (/banid|removido do ar/.test(t)) return { tom: 'perigo', icone: 'pi-ban' };
        if (/procedente|suspens|strike/.test(t)) return { tom: 'alerta', icone: 'pi-exclamation-triangle' };
        if (/prazo|venc/.test(t)) return { tom: 'info', icone: 'pi-clock' };
        if (/apuração/.test(t)) return { tom: 'info', icone: 'pi-search' };
        return { tom: 'info', icone: 'pi-info-circle' };
    }

    ehPdf(url: string) {
        return url.toLowerCase().endsWith('.pdf');
    }

    /** Para o anunciante a moderação não tem nome nem foto: aparece com o escudo. */
    moderacaoAnonima(m: MensagemDenuncia) {
        return m.papel === 'ADMIN' && this.visao() === 'anunciante';
    }
}
