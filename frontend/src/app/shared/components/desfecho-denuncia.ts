import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { correcaoPendente, Denuncia, denunciaAberta, NATUREZAS, StatusAnuncio, statusInfo } from '@/app/core/models/models';
import { TextoRicoView } from './texto-rico';

type Tom = 'sucesso' | 'neutro' | 'alerta' | 'perigo';

interface Resumo {
    tom: Tom;
    icone: string;
    titulo: string;
    texto: string;
}

/**
 * Desfecho de uma denúncia, em destaque: o que foi decidido, o que aconteceu com o anúncio e (para a
 * moderação) com a conta, quando, e a fundamentação. Aparece quando a denúncia foi encerrada ou julgada
 * procedente com correção solicitada. Fora disso não mostra nada.
 */
@Component({
    selector: 'app-desfecho-denuncia',
    imports: [DatePipe, TextoRicoView],
    template: `
        @if (resumo(); as r) {
            <section class="desfecho" [class]="'desfecho desfecho--' + r.tom" [attr.aria-labelledby]="id + '-titulo'">
                <div class="desfecho__topo">
                    <span class="desfecho__icone" aria-hidden="true"><i class="pi {{ r.icone }}"></i></span>
                    <div class="min-w-0">
                        <h4 class="desfecho__titulo" [id]="id + '-titulo'">{{ r.titulo }}</h4>
                        <p class="desfecho__texto">{{ r.texto }}</p>
                    </div>
                </div>

                <dl class="desfecho__itens">
                    @if (natureza(); as n) {
                        <div>
                            <dt>Constatação</dt>
                            <dd>
                                <strong>{{ n.label }}</strong> <span class="text-muted-color">— {{ n.dica }}</span>
                            </dd>
                        </div>
                    }
                    @if (statusAnuncio(); as s) {
                        <div>
                            <dt>Anúncio agora</dt>
                            <dd>
                                <strong>{{ anuncio().label }}</strong> <span class="text-muted-color">— {{ anuncio().texto }}</span>
                            </dd>
                        </div>
                    }
                    @if (conta(); as c) {
                        <div>
                            <dt>Conta do anunciante</dt>
                            <dd>
                                <strong>{{ c.label }}</strong> <span class="text-muted-color">— {{ c.texto }}</span>
                            </dd>
                        </div>
                    }
                    <div>
                        <dt>Datas</dt>
                        <dd class="desfecho__datas">
                            <span>Recebida em {{ denuncia().criadoEm | date: "dd/MM/yyyy 'às' HH:mm" }}</span>
                            @if (denuncia().julgadoEm) {
                                <span>Julgada em {{ denuncia().julgadoEm | date: "dd/MM/yyyy 'às' HH:mm" }}</span>
                            }
                            @if (aberta() && denuncia().prazo.prazoEm) {
                                <span
                                    ><strong>Prazo da correção: {{ denuncia().prazo.prazoEm | date: "dd/MM/yyyy 'às' HH:mm" }}</strong></span
                                >
                            }
                            @if (denuncia().resolvidoEm) {
                                <span>Encerrada em {{ denuncia().resolvidoEm | date: "dd/MM/yyyy 'às' HH:mm" }}</span>
                                <span class="text-muted-color">({{ duracao() }} do início ao fim)</span>
                            }
                        </dd>
                    </div>
                    @if (fundamentacao(); as f) {
                        <div>
                            <dt>{{ denuncia().natureza ? 'Fundamentação da moderação' : 'Conclusão da moderação' }}</dt>
                            <dd><app-texto-rico [texto]="f" /></dd>
                        </div>
                    }
                </dl>
            </section>
        }
    `,
    styles: `
        .desfecho {
            --tom: var(--p-primary-color);
            border: 1px solid color-mix(in srgb, var(--tom), transparent 60%);
            border-left: 4px solid var(--tom);
            border-radius: 10px;
            background: color-mix(in srgb, var(--tom), transparent 93%);
            padding: 1rem 1.1rem;
            margin-bottom: 1rem;
        }
        .desfecho--sucesso {
            --tom: var(--p-green-600);
        }
        .desfecho--neutro {
            --tom: var(--p-surface-500);
        }
        .desfecho--alerta {
            --tom: var(--p-orange-500);
        }
        .desfecho--perigo {
            --tom: var(--p-red-600);
        }
        .desfecho__topo {
            display: flex;
            align-items: flex-start;
            gap: 0.85rem;
        }
        .desfecho__icone {
            flex-shrink: 0;
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            background: var(--tom);
            font-size: 1.15rem;
        }
        .desfecho__titulo {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 700;
            line-height: 1.3;
        }
        .desfecho__texto {
            margin: 0.2rem 0 0;
            line-height: 1.45;
        }
        .desfecho__itens {
            margin: 0.9rem 0 0;
            padding-top: 0.75rem;
            border-top: 1px solid color-mix(in srgb, var(--tom), transparent 70%);
            display: grid;
            gap: 0.6rem;
        }
        .desfecho__itens > div {
            display: grid;
            grid-template-columns: 11rem minmax(0, 1fr);
            gap: 0.75rem;
        }
        .desfecho__itens dt {
            font-size: 0.78rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--p-text-muted-color);
            padding-top: 0.15rem;
        }
        .desfecho__itens dd {
            margin: 0;
            line-height: 1.45;
        }
        .desfecho__datas {
            display: flex;
            flex-wrap: wrap;
            column-gap: 1rem;
            row-gap: 0.2rem;
        }
        @media (max-width: 640px) {
            .desfecho__itens > div {
                grid-template-columns: 1fr;
                gap: 0.15rem;
            }
        }
    `
})
export class DesfechoDenuncia {
    private static seq = 0;
    readonly id = 'desfecho-' + ++DesfechoDenuncia.seq;

    denuncia = input.required<Denuncia>();
    /** Situação atual do anúncio (para dizer se está no ar). */
    statusAnuncio = input<StatusAnuncio | null>(null);
    visao = input<'admin' | 'anunciante'>('anunciante');

    aberta = computed(() => denunciaAberta(this.denuncia()));

    resumo = computed<Resumo | null>(() => {
        const d = this.denuncia();
        const admin = this.visao() === 'admin';
        if (correcaoPendente(d)) {
            return d.status === 'AGUARDANDO_ANUNCIANTE'
                ? {
                      tom: 'alerta',
                      icone: 'pi-wrench',
                      titulo: 'Procedente · aguardando correção',
                      texto: admin
                          ? 'A denúncia se confirmou e o anunciante precisa corrigir o anúncio no prazo. Depois, aceite a correção ou julgue de novo.'
                          : 'A moderação confirmou a denúncia. Corrija o anúncio e responda abaixo informando o que foi feito, dentro do prazo.'
                  }
                : {
                      tom: 'alerta',
                      icone: 'pi-hourglass',
                      titulo: 'Procedente · correção em validação',
                      texto: admin ? 'O anunciante informou a correção. Confira o anúncio e aceite a correção ou julgue de novo.' : 'Você informou a correção. A moderação vai validar o que foi feito.'
                  };
        }
        switch (d.status) {
            case 'RESOLVIDA':
                return {
                    tom: 'sucesso',
                    icone: 'pi-check-circle',
                    titulo: 'Pendência resolvida',
                    texto: 'A moderação aprovou a solução apresentada pelo anunciante. A denúncia foi encerrada sem julgamento e sem penalidade.'
                };
            case 'IMPROCEDENTE':
                return {
                    tom: 'neutro',
                    icone: 'pi-times-circle',
                    titulo: 'Denúncia improcedente',
                    texto: 'A moderação concluiu que o problema relatado não se confirmou. Nenhuma medida foi aplicada ao anúncio nem à conta.'
                };
            case 'ANUNCIO_BANIDO':
                return {
                    tom: 'perigo',
                    icone: 'pi-ban',
                    titulo: 'Encerrada: anúncio removido do ar',
                    texto: 'A denúncia foi encerrada porque o anúncio foi banido (por outra denúncia, pela automação de prazos ou pela moderação).'
                };
            case 'PROCEDENTE':
                switch (d.medida) {
                    case 'CORRIGIR':
                        return {
                            tom: 'alerta',
                            icone: 'pi-check-square',
                            titulo: 'Procedente · correção aceita',
                            texto: 'A denúncia se confirmou, o anunciante corrigiu o anúncio e a moderação aceitou a correção. O caso está encerrado.'
                        };
                    case 'SUSPENDER':
                        return {
                            tom: 'perigo',
                            icone: 'pi-pause-circle',
                            titulo: 'Procedente · anúncio suspenso',
                            texto: 'A denúncia se confirmou e o anúncio foi suspenso: fica fora da busca até a moderação reativá-lo.'
                        };
                    case 'BANIR':
                        return { tom: 'perigo', icone: 'pi-ban', titulo: 'Procedente · anúncio removido do ar', texto: 'A denúncia se confirmou e o anúncio foi removido do ar definitivamente.' };
                    default:
                        return { tom: 'alerta', icone: 'pi-exclamation-circle', titulo: 'Procedente · anúncio mantido', texto: 'A denúncia se confirmou, mas o anúncio pôde continuar no ar.' };
                }
            default:
                return null;
        }
    });

    natureza = computed(() => NATUREZAS.find((n) => n.value === this.denuncia().natureza) ?? null);

    anuncio = computed(() => {
        const s = this.statusAnuncio();
        const texto: Partial<Record<StatusAnuncio, string>> = {
            ATIVO: 'no ar e aparecendo na busca',
            PAUSADO: 'pausado pelo anunciante',
            PENDENTE: 'aguardando publicação',
            CONCLUIDO: 'marcado como vendido/alugado',
            BLOQUEADO: 'bloqueado, fora do site',
            SUSPENSO: 'fora da busca até a moderação reativar',
            BANIDO: 'removido do ar definitivamente'
        };
        return { label: s ? statusInfo(s).label : '', texto: (s && texto[s]) || '' };
    });

    /** Só a moderação vê a penalidade. */
    conta = computed(() => {
        switch (this.denuncia().penalidade) {
            case 'STRIKE':
                return { label: 'Strike registrado', texto: 'conta para o banimento automático da conta, conforme a regra da gravidade' };
            case 'BANIR_CONTA':
                return { label: 'Conta banida', texto: 'a conta ficou inativa e os anúncios saíram do ar' };
            case 'NENHUMA':
                return { label: 'Sem penalidade', texto: 'fica só no histórico do anunciante' };
            default:
                return null;
        }
    });

    /**
     * Conclusão gravada ou, nas denúncias antigas em que ela se perdeu ao aceitar a correção, a mensagem
     * pública da moderação enviada junto com o julgamento procedente.
     */
    fundamentacao = computed(() => {
        const d = this.denuncia();
        if (d.conclusao) return d.conclusao;
        if (!d.julgadoEm) return null;
        const limite = new Date(d.julgadoEm).getTime() + 5000;
        const doJulgamento = d.mensagens.filter((m) => m.papel === 'ADMIN' && !m.interna && new Date(m.criadoEm).getTime() <= limite).at(-1);
        return doJulgamento?.texto ?? null;
    });

    duracao = computed(() => {
        const d = this.denuncia();
        if (!d.resolvidoEm) return '';
        const min = Math.max(0, Math.round((new Date(d.resolvidoEm).getTime() - new Date(d.criadoEm).getTime()) / 60000));
        if (min < 60) return `${min} min`;
        const h = Math.floor(min / 60);
        if (h < 48) return `${h} h${min % 60 ? ' ' + (min % 60) + ' min' : ''}`;
        return `${Math.floor(h / 24)} dias`;
    });
}
