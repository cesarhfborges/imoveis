import { Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import qrcode from 'qrcode-generator';
import { CONDICOES, DOCUMENTACAO, Finalidade, ImovelDetalhe, finalidadeLabel, tituloAnuncio } from '@/app/core/models/models';
import { formatarCep, formatarTelefone, slug } from '@/app/core/pipes/formatos';

interface Linha {
    rotulo: string;
    valor: string;
    destaque?: boolean;
    nota?: string;
}

interface GrupoCondicao {
    titulo: string;
    itens: { label: string; sim: boolean }[];
}

/** O que muda na ficha conforme a finalidade: chamada, dica de uso, itens a avaliar e o bloco de contas. */
const ROTEIRO: Record<Finalidade, { titulo: string; dica: string; avaliar: string[]; conta: { titulo: string; linhas: string[] } }> = {
    VENDA: {
        titulo: 'Ficha de visita · compra',
        dica: 'Leve à visita, anote suas impressões e compare com os outros imóveis que você está vendo.',
        avaliar: ['Estado de conservação', 'Iluminação e posição do sol', 'Barulho e vizinhança', 'Comércio, escolas e serviços', 'Acesso e transporte', 'Documentação conferida'],
        conta: { titulo: 'Negociação', linhas: ['Valor que pretendo oferecer', 'Entrada disponível', 'Financiar / usar FGTS'] }
    },
    ALUGUEL: {
        titulo: 'Ficha de visita · aluguel',
        dica: 'Leve à visita, confira o estado do imóvel e some todos os custos do mês antes de decidir.',
        avaliar: ['Pintura, pisos e portas', 'Elétrica, hidráulica e chuveiros', 'Iluminação e posição do sol', 'Barulho e vizinhança', 'Acesso e transporte', 'Vistoria de entrada combinada'],
        conta: { titulo: 'Custo do mês', linhas: ['Aluguel + condomínio', 'IPTU, água, luz e gás', 'Total que cabe no meu orçamento'] }
    },
    TEMPORADA: {
        titulo: 'Ficha da estadia · temporada',
        dica: 'Use para planejar as datas, confirmar o que está incluso e calcular quanto vai custar a estadia.',
        avaliar: ['Roupa de cama e banho', 'Wi-fi e TV', 'Cozinha e utensílios', 'Estacionamento', 'Ar-condicionado / ventilação', 'Regras da casa e chaves'],
        conta: { titulo: 'Custo da estadia', linhas: ['Diária × noites', 'Taxa de limpeza e extras', 'Total da estadia'] }
    }
};

/**
 * Ficha do imóvel em uma folha A4: fotos, números, valores e condições conforme a finalidade, contato do anunciante,
 * QR code do anúncio e espaço para anotações da visita. Não aparece no site: o FichaPdfService a desenha fora da
 * tela, transforma em PDF e manda para a impressão.
 */
@Component({
    selector: 'app-ficha-imovel',
    imports: [DatePipe],
    template: `
        @let i = imovel();
        @let r = roteiro();
        <article class="folha" [attr.aria-label]="r.titulo + ' do imóvel ' + i.codigo">
            <!-- faixa: marca do site, chamada da finalidade e código -->
            <header class="fo-faixa">
                <div class="fo-faixa__marca">
                    @if (logoUrl()) {
                        <img [src]="logoUrl()" [alt]="nomeSite()" />
                    } @else {
                        <span>{{ nomeSite() }}</span>
                    }
                </div>
                <div class="fo-faixa__chamada">
                    <strong>{{ r.titulo }}</strong>
                    <span>{{ r.dica }}</span>
                </div>
                <div class="fo-faixa__codigo">
                    <span>Código</span>
                    <strong>{{ i.codigo }}</strong>
                </div>
            </header>

            <!-- fotos em mosaico: capa grande + até duas menores -->
            @if (fotos().length) {
                <div class="fo-fotos" [attr.data-qtd]="fotos().length">
                    @for (f of fotos(); track f.url; let n = $index) {
                        <figure>
                            <img [src]="f.url" [alt]="n === 0 ? 'Foto principal do imóvel' : 'Foto ' + (n + 1) + ' do imóvel'" />
                            @if (f.origem === 'IA') {
                                <figcaption>Imagem criada ou alterada com IA</figcaption>
                            }
                        </figure>
                    }
                </div>
            }

            <!-- o que é e onde fica -->
            <section class="fo-id">
                <div class="fo-id__texto">
                    <div class="fo-id__selos">
                        <span class="fo-selo fo-selo--cheio">{{ finalidadeLabel(i.finalidade) }}</span>
                        <span class="fo-selo">{{ i.tipoDescricao }}</span>
                        @if (i.lancamento) {
                            <span class="fo-selo">Imóvel novo</span>
                        }
                    </div>
                    <h1>{{ tituloAnuncio(i) }}</h1>
                    @if (i.cep) {
                        <p>CEP {{ cep(i.cep) }}</p>
                    }
                </div>
                @if (principal(); as p) {
                    <div class="fo-id__preco">
                        <span>{{ p.rotulo }}</span>
                        <strong>{{ p.valor }}</strong>
                    </div>
                }
            </section>

            <!-- régua com os números principais -->
            @if (numeros().length) {
                <dl class="fo-regua">
                    @for (n of numeros(); track n.rotulo) {
                        <div>
                            <dd>{{ n.valor }}</dd>
                            <dt>{{ n.rotulo }}</dt>
                        </div>
                    }
                </dl>
            }

            <div class="fo-corpo">
                <div class="fo-corpo__principal">
                    <section aria-labelledby="fo-valores">
                        <h2 id="fo-valores" class="fo-titulo">{{ tituloValores() }}</h2>
                        <dl class="fo-valores">
                            @for (v of secundarios(); track v.rotulo) {
                                <div>
                                    <dt>{{ v.rotulo }}</dt>
                                    <dd>
                                        {{ v.valor }}
                                        @if (v.nota) {
                                            <small>{{ v.nota }}</small>
                                        }
                                    </dd>
                                </div>
                            }
                        </dl>
                    </section>

                    @if (condicoes().length) {
                        <section aria-labelledby="fo-condicoes">
                            <h2 id="fo-condicoes" class="fo-titulo">{{ tituloCondicoes() }}</h2>
                            @for (g of condicoes(); track g.titulo) {
                                <div class="fo-cond">
                                    <h3>{{ g.titulo }}</h3>
                                    <ul>
                                        @for (c of g.itens; track c.label) {
                                            <li [class.nao]="!c.sim">
                                                <i class="pi" [class.pi-check]="c.sim" [class.pi-times]="!c.sim" aria-hidden="true"></i>{{ c.label }}
                                                <span class="sr-only">{{ c.sim ? 'sim' : 'não' }}</span>
                                            </li>
                                        }
                                    </ul>
                                </div>
                            }
                        </section>
                    }

                    <section class="fo-sobre" aria-labelledby="fo-sobre">
                        <h2 id="fo-sobre" class="fo-titulo">Sobre o imóvel</h2>
                        @if (i.titulo) {
                            <p class="fo-sobre__titulo">{{ i.titulo }}</p>
                        }
                        <p class="fo-sobre__texto" [style.--linhas]="linhasDescricao()">{{ i.descricao || 'O anunciante não escreveu uma descrição.' }}</p>
                        @if (i.caracteristicas.length) {
                            <p class="fo-sobre__carac"><strong>Destaques:</strong> {{ i.caracteristicas.join(' · ') }}</p>
                        }
                    </section>
                </div>

                <aside class="fo-corpo__lateral" aria-label="Contato e acesso ao anúncio">
                    <section class="fo-contato">
                        <h2 class="fo-titulo">Anunciante</h2>
                        @if (i.anunciante; as a) {
                            <p class="fo-contato__nome">{{ a.nome }}</p>
                            @if (a.creci) {
                                <p>Creci {{ a.creci }}</p>
                            }
                            @if (telefone(); as t) {
                                <p class="fo-contato__tel"><i class="pi pi-phone" aria-hidden="true"></i> {{ t }}</p>
                            }
                        } @else {
                            <p>Contato pelo anúncio no site.</p>
                        }
                    </section>
                    <section class="fo-qr">
                        <svg [attr.viewBox]="qr().caixa" role="img" aria-label="QR code com o link do anúncio" shape-rendering="crispEdges">
                            <!-- cores nos atributos (não por classe): a captura em imagem não leva o CSS para dentro do SVG -->
                            <rect x="-2" y="-2" [attr.width]="qr().lado" [attr.height]="qr().lado" fill="#ffffff" />
                            <path [attr.d]="qr().d" fill="#000000" />
                        </svg>
                        <p>Aponte a câmera do celular para ver todas as fotos, o mapa e falar com o anunciante.</p>
                    </section>
                </aside>
            </div>

            <!-- espaço do visitante: muda conforme a finalidade -->
            <section class="fo-notas" aria-labelledby="fo-notas-titulo">
                <h2 id="fo-notas-titulo" class="fo-notas__titulo"><i class="pi pi-pencil" aria-hidden="true"></i> Minhas anotações</h2>
                <div class="fo-notas__grade">
                    <div class="fo-notas__col">
                        @if (i.finalidade === 'TEMPORADA') {
                            <p class="fo-campo fo-campo--quando">
                                Entrada <span class="fo-linha fo-linha--data"><span>/</span><span>/</span></span> Saída <span class="fo-linha fo-linha--data"><span>/</span><span>/</span></span>
                            </p>
                            <p class="fo-campo">Hóspedes <span class="fo-linha fo-linha--curta"></span> Noites <span class="fo-linha fo-linha--curta"></span></p>
                        } @else {
                            <p class="fo-campo fo-campo--quando">
                                Visitei em <span class="fo-linha fo-linha--data"><span>/</span><span>/</span></span> às <span class="fo-linha fo-linha--hora"><span>:</span></span>
                            </p>
                            <p class="fo-campo">Quem me atendeu <span class="fo-linha"></span></p>
                        }
                        <table class="fo-avaliar">
                            <caption class="sr-only">
                                {{
                                    i.finalidade === 'TEMPORADA' ? 'Confirmar com o anfitrião' : 'Avaliação da visita'
                                }}
                            </caption>
                            <thead>
                                <tr>
                                    <th scope="col">{{ i.finalidade === 'TEMPORADA' ? 'Confirmar' : 'Avaliar' }}</th>
                                    @for (c of colunasAvaliar(); track c) {
                                        <th scope="col">{{ c }}</th>
                                    }
                                </tr>
                            </thead>
                            <tbody>
                                @for (item of r.avaliar; track item) {
                                    <tr>
                                        <th scope="row">{{ item }}</th>
                                        @for (c of colunasAvaliar(); track c) {
                                            <td><span class="fo-caixa" aria-hidden="true"></span></td>
                                        }
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                    <div class="fo-notas__col">
                        <p class="fo-rotulo">O que mais gostei</p>
                        <span class="fo-linha fo-linha--bloco"></span>
                        <span class="fo-linha fo-linha--bloco"></span>
                        <p class="fo-rotulo">O que me preocupa</p>
                        <span class="fo-linha fo-linha--bloco"></span>
                        <span class="fo-linha fo-linha--bloco"></span>
                        <p class="fo-rotulo">{{ r.conta.titulo }}</p>
                        @for (l of r.conta.linhas; track l) {
                            <p class="fo-campo">{{ l }} <span>R$</span><span class="fo-linha"></span></p>
                        }
                        <div class="fo-nota">
                            <span>{{ i.finalidade === 'VENDA' ? 'Vontade de comprar' : i.finalidade === 'ALUGUEL' ? 'Vontade de alugar' : 'Vontade de reservar' }}</span>
                            <ol aria-label="Marque de 1 a 5">
                                @for (n of [1, 2, 3, 4, 5]; track n) {
                                    <li>{{ n }}</li>
                                }
                            </ol>
                        </div>
                    </div>
                </div>
            </section>

            <footer class="fo-rodape">
                <p>Dados informados pelo anunciante e atualizados em {{ i.atualizadoEm | date: 'dd/MM/yyyy' }}. Valores, condições e disponibilidade podem mudar sem aviso: confirme no anúncio antes de fechar negócio.</p>
                <p class="fo-rodape__fonte">
                    <span>{{ link() }}</span>
                    <span>Impresso em {{ geradoEm | date: "dd/MM/yyyy 'às' HH:mm" }}</span>
                </p>
            </footer>
        </article>
    `,
    styles: `
        :host {
            --fo-tinta: var(--p-surface-900);
            --fo-suave: var(--p-surface-600);
            --fo-borda: var(--p-surface-300);
            --fo-fundo: var(--p-surface-100);
            --fo-marca: var(--p-primary-800);
            --fo-marca-texto: var(--p-primary-700);
            display: block;
            width: 210mm;
            color: var(--fo-tinta);
            font-size: 9pt;
        }
        /* --- a folha A4 --- */
        .folha {
            box-sizing: border-box;
            width: 210mm;
            height: 297mm;
            overflow: hidden;
            margin: 0;
            padding: 0 0 6mm;
            display: flex;
            flex-direction: column;
            gap: 3.5mm;
            background: var(--p-surface-0);
            color: var(--fo-tinta);
            line-height: 1.35;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            > *:not(.fo-faixa) {
                margin-inline: 10mm;
            }
        }
        .fo-faixa {
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 6mm;
            padding: 5mm 10mm;
            background: var(--fo-marca);
            color: var(--p-surface-0);
        }
        .fo-faixa__marca {
            display: flex;
            align-items: center;
            padding: 2mm 3mm;
            border-radius: 2mm;
            background: var(--p-surface-0);
            color: var(--fo-marca-texto);
            font-weight: 800;
            font-size: 12pt;
            img {
                display: block;
                max-height: 11mm;
                max-width: 42mm;
            }
        }
        .fo-faixa__chamada {
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
            strong {
                font-size: 14pt;
                letter-spacing: 0.01em;
            }
            span {
                font-size: 8pt;
                opacity: 0.9;
            }
        }
        .fo-faixa__codigo {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            span {
                font-size: 7pt;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                opacity: 0.85;
            }
            strong {
                font-size: 13pt;
                font-variant-numeric: tabular-nums;
            }
        }

        .fo-fotos {
            display: grid;
            grid-template-columns: 2fr 1fr;
            grid-template-rows: 25mm 25mm;
            gap: 2mm;
            figure {
                position: relative;
                margin: 0;
                overflow: hidden;
                border-radius: 2mm;
                background: var(--fo-fundo);
            }
            figure:first-child {
                grid-row: span 2;
            }
            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }
            figcaption {
                position: absolute;
                left: 1.5mm;
                bottom: 1.5mm;
                padding: 0.5mm 1.5mm;
                border-radius: 1mm;
                background: rgb(0 0 0 / 0.65);
                color: var(--p-surface-0);
                font-size: 6.5pt;
            }
            &[data-qtd='1'] {
                grid-template-columns: 1fr;
            }
            &[data-qtd='2'] figure:nth-child(2) {
                grid-row: span 2;
            }
        }

        .fo-id {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 6mm;
            h1 {
                margin: 1.5mm 0 0;
                font-size: 15pt;
                line-height: 1.2;
                font-weight: 800;
            }
            p {
                margin: 0.5mm 0 0;
                color: var(--fo-suave);
            }
        }
        .fo-id__texto {
            min-width: 0;
        }
        .fo-id__preco {
            flex: none;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            padding: 1.5mm 3.5mm;
            border: 1.5px solid var(--fo-marca);
            border-radius: 2mm;
            span {
                font-size: 7.5pt;
                font-weight: 700;
                color: var(--fo-marca-texto);
            }
            strong {
                font-size: 16pt;
                font-weight: 800;
                white-space: nowrap;
            }
        }
        .fo-id__selos {
            display: flex;
            flex-wrap: wrap;
            gap: 1.5mm;
        }
        .fo-selo {
            padding: 0.6mm 2.5mm;
            border-radius: 999px;
            border: 1px solid var(--fo-marca);
            color: var(--fo-marca-texto);
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .fo-selo--cheio {
            background: var(--fo-marca);
            color: var(--p-surface-0);
        }

        .fo-regua {
            display: flex;
            margin-block: 0;
            border-block: 1.5px solid var(--fo-tinta);
            > div {
                flex: 1;
                display: flex;
                flex-direction: column-reverse;
                align-items: center;
                padding: 2mm 1mm;
            }
            > div + div {
                border-left: 1px solid var(--fo-borda);
            }
            dd {
                margin: 0;
                font-size: 13pt;
                font-weight: 800;
                font-variant-numeric: tabular-nums;
            }
            dt {
                font-size: 7pt;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--fo-suave);
            }
        }

        /* o corpo fica com a altura que sobra na folha; a descrição é a parte que encolhe */
        .fo-corpo {
            flex: 1 1 0;
            min-height: 0;
            display: grid;
            grid-template-columns: 1fr 46mm;
            grid-template-rows: minmax(0, 1fr);
            gap: 6mm;
            overflow: hidden;
        }
        .fo-corpo__principal {
            display: flex;
            flex-direction: column;
            gap: 3mm;
            min-width: 0;
            min-height: 0;
        }
        .fo-sobre {
            flex: 1 1 0;
            min-height: 19mm;
            overflow: hidden;
        }
        .fo-titulo {
            margin: 0 0 1.5mm;
            font-size: 8pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--fo-marca-texto);
        }
        .fo-valores {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5mm;
            margin: 0;
            > div {
                padding: 1.8mm 2.5mm;
                border-radius: 1.5mm;
                background: var(--fo-fundo);
            }
            dt {
                font-size: 7pt;
                color: var(--fo-suave);
            }
            dd {
                margin: 0;
                font-weight: 700;
                font-size: 10pt;
                small {
                    display: block;
                    font-weight: 400;
                    font-size: 6.5pt;
                    color: var(--fo-suave);
                }
            }
        }
        .fo-cond {
            display: grid;
            grid-template-columns: 38mm 1fr;
            gap: 2mm;
            padding: 1mm 0;
            border-top: 1px dotted var(--fo-borda);
            h3 {
                margin: 0;
                font-size: 7.5pt;
                font-weight: 700;
                white-space: nowrap;
            }
            ul {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5mm 3.5mm;
                margin: 0;
                padding: 0;
                list-style: none;
            }
            li {
                display: inline-flex;
                align-items: center;
                gap: 1mm;
                font-size: 7.5pt;
                i {
                    font-size: 6.5pt;
                    color: var(--fo-marca-texto);
                }
            }
            li.nao {
                color: var(--fo-suave);
                text-decoration: line-through;
                i {
                    color: var(--fo-suave);
                }
            }
        }
        .fo-sobre__titulo {
            margin: 0 0 1mm;
            font-weight: 700;
        }
        .fo-sobre__texto {
            margin: 0;
            font-size: 8pt;
            white-space: pre-line;
            text-align: justify;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: var(--linhas, 6);
            line-clamp: var(--linhas, 6);
            overflow: hidden;
        }
        .fo-sobre__carac {
            margin: 1.5mm 0 0;
            font-size: 7.5pt;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .fo-corpo__lateral {
            display: flex;
            flex-direction: column;
            gap: 3mm;
        }
        .fo-contato {
            padding-left: 3mm;
            border-left: 1.5px solid var(--fo-marca);
            p {
                margin: 0;
                font-size: 7.5pt;
                color: var(--fo-suave);
            }
        }
        .fo-contato__nome {
            font-size: 9.5pt !important;
            font-weight: 700;
            color: var(--fo-tinta) !important;
        }
        .fo-contato__tel {
            margin-top: 1mm !important;
            font-size: 9.5pt !important;
            font-weight: 700;
            color: var(--fo-tinta) !important;
        }
        .fo-qr {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5mm;
            padding: 2.5mm;
            border: 1px dashed var(--fo-borda);
            border-radius: 2mm;
            text-align: center;
            svg {
                width: 30mm;
                height: 30mm;
            }
            p {
                margin: 0;
                font-size: 6.5pt;
                color: var(--fo-suave);
            }
        }
        .fo-notas {
            flex: none;
            padding: 2.5mm 4mm 3mm;
            border: 1.5px dashed var(--fo-suave);
            border-radius: 3mm;
        }
        .fo-notas__titulo {
            display: flex;
            align-items: center;
            gap: 1.5mm;
            margin: 0 0 2mm;
            font-size: 10pt;
            font-weight: 800;
            i {
                font-size: 8pt;
                color: var(--fo-marca-texto);
            }
        }
        .fo-notas__grade {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6mm;
        }
        .fo-notas__col {
            display: flex;
            flex-direction: column;
            gap: 1.2mm;
        }
        .fo-campo {
            display: flex;
            align-items: flex-end;
            gap: 1.5mm;
            margin: 0;
            font-size: 8pt;
            white-space: nowrap;
        }
        .fo-rotulo {
            margin: 1mm 0 0;
            font-size: 7.5pt;
            font-weight: 700;
        }
        .fo-linha {
            flex: 1;
            display: block;
            min-width: 8mm;
            height: 4mm;
            border-bottom: 1px solid var(--fo-suave);
        }
        .fo-linha--curta {
            flex: 0 0 20mm;
        }
        /* data e hora: espaço para escrever à mão, com as barras e os dois-pontos já marcados */
        .fo-campo--quando {
            font-size: 8.5pt;
            font-weight: 600;
        }
        .fo-linha--data,
        .fo-linha--hora {
            display: flex;
            align-items: flex-end;
            justify-content: space-evenly;
            height: 6mm;
            font-weight: 400;
            font-size: 10pt;
            line-height: 1;
            color: var(--fo-suave);
        }
        .fo-linha--data {
            min-width: 32mm;
        }
        .fo-linha--hora {
            flex: 0 0 18mm;
        }
        .fo-linha--bloco {
            flex: none;
            height: 4.5mm;
        }
        .fo-avaliar {
            width: 100%;
            margin-top: 1mm;
            border-collapse: collapse;
            font-size: 7.5pt;
            th,
            td {
                padding: 0.5mm 1mm;
                border-bottom: 1px solid var(--fo-borda);
            }
            thead th {
                font-size: 6.5pt;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                color: var(--fo-suave);
                text-align: center;
            }
            thead th:first-child,
            tbody th {
                text-align: left;
                font-weight: 400;
            }
            td {
                text-align: center;
                width: 10mm;
            }
        }
        .fo-caixa {
            display: inline-block;
            width: 3mm;
            height: 3mm;
            border: 1px solid var(--fo-tinta);
            border-radius: 0.6mm;
        }
        .fo-nota {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2mm;
            margin-top: 1.5mm;
            font-size: 7.5pt;
            font-weight: 700;
            ol {
                display: flex;
                gap: 1.5mm;
                margin: 0;
                padding: 0;
                list-style: none;
            }
            li {
                display: grid;
                place-items: center;
                width: 5.5mm;
                height: 5.5mm;
                border: 1px solid var(--fo-tinta);
                border-radius: 50%;
                font-size: 7pt;
                font-weight: 400;
            }
        }

        .fo-rodape {
            flex: none;
            padding-top: 1.5mm;
            border-top: 1px solid var(--fo-borda);
            font-size: 6.5pt;
            color: var(--fo-suave);
            p {
                margin: 0;
            }
        }
        .fo-rodape__fonte {
            display: flex;
            justify-content: space-between;
            gap: 4mm;
            margin-top: 0.8mm !important;
            span:first-child {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        }
    `
})
export class FichaImovel {
    private host = inject<ElementRef<HTMLElement>>(ElementRef);

    imovel = input.required<ImovelDetalhe>();
    nomeSite = input.required<string>();
    logoUrl = input<string | null>(null);

    protected readonly tituloAnuncio = tituloAnuncio;
    protected readonly finalidadeLabel = finalidadeLabel;
    protected readonly cep = formatarCep;
    protected readonly geradoEm = new Date();

    /** Linhas da descrição que cabem no espaço livre da folha (ver ajustarDescricao). */
    linhasDescricao = signal(6);
    roteiro = computed(() => ROTEIRO[this.imovel().finalidade]);
    colunasAvaliar = computed(() => (this.imovel()?.finalidade === 'TEMPORADA' ? ['Tem', 'Não tem'] : ['Bom', 'Regular', 'Ruim']));
    fotos = computed(() => (this.imovel()?.fotos ?? []).slice(0, 3));
    link = computed(() => {
        const i = this.imovel();
        return `${location.origin}/imovel/${i.id}/${slug(tituloAnuncio(i))}`;
    });
    /** Telefone só quando o anúncio já traz o número completo (a regra do site pode escondê-lo). */
    telefone = computed(() => {
        const a = this.imovel()?.anunciante;
        return a?.telefone && a.telefoneCompleto ? formatarTelefone(a.telefone) : null;
    });

    /** Módulos do QR code em um único path SVG (sem innerHTML, cores pelo CSS). */
    qr = computed(() => {
        const q = qrcode(0, 'M');
        q.addData(this.link());
        q.make();
        const n = q.getModuleCount();
        let d = '';
        for (let lin = 0; lin < n; lin++) {
            for (let col = 0; col < n; col++) {
                if (q.isDark(lin, col)) d += `M${col} ${lin}h1v1h-1z`;
            }
        }
        return { d, lado: n + 4, caixa: `-2 -2 ${n + 4} ${n + 4}` };
    });

    numeros = computed(() => {
        const i = this.imovel();
        if (!i) return [];
        const m2 = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' m²';
        const itens: { valor: string; rotulo: string }[] = [];
        if (i.areaUtil) itens.push({ valor: m2(i.areaUtil), rotulo: 'Área útil' });
        if (i.areaTotal && i.areaTotal !== i.areaUtil) itens.push({ valor: m2(i.areaTotal), rotulo: 'Área total' });
        if (i.quartos) itens.push({ valor: String(i.quartos), rotulo: i.quartos === 1 ? 'Quarto' : 'Quartos' });
        if (i.suites) itens.push({ valor: String(i.suites), rotulo: i.suites === 1 ? 'Suíte' : 'Suítes' });
        if (i.banheiros) itens.push({ valor: String(i.banheiros), rotulo: i.banheiros === 1 ? 'Banheiro' : 'Banheiros' });
        if (i.vagas) itens.push({ valor: String(i.vagas), rotulo: i.vagas === 1 ? 'Vaga' : 'Vagas' });
        if (i.finalidade === 'TEMPORADA' && i.hospedesMaximo) itens.push({ valor: String(i.hospedesMaximo), rotulo: 'Hóspedes' });
        return itens;
    });

    tituloValores = computed(() => ({ VENDA: 'Valores', ALUGUEL: 'Custos mensais', TEMPORADA: 'Valores da estadia' })[this.imovel()?.finalidade ?? 'VENDA']);
    tituloCondicoes = computed(() => ({ VENDA: 'Pagamento e documentação', ALUGUEL: 'Condições do contrato', TEMPORADA: 'Comodidades e regras' })[this.imovel()?.finalidade ?? 'VENDA']);

    /** Valores conforme a finalidade: venda (preço, m², taxas), aluguel (custo do mês) e temporada (diária e estadia). */
    valores = computed<Linha[]>(() => {
        const i = this.imovel();
        if (!i) return [];
        const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const linhas: Linha[] = [];
        if (i.finalidade === 'VENDA') {
            linhas.push({ rotulo: 'Valor de venda', valor: brl(i.preco), destaque: true });
            if (i.areaUtil) linhas.push({ rotulo: 'Valor do m²', valor: brl(i.preco / i.areaUtil), nota: 'pela área útil' });
            linhas.push({ rotulo: 'Condomínio', valor: i.condominio ? brl(i.condominio) : 'Não informado', nota: i.condominio ? 'por mês' : undefined });
            linhas.push({ rotulo: 'IPTU', valor: i.iptu ? brl(i.iptu) : 'Não informado' });
        } else if (i.finalidade === 'ALUGUEL') {
            const condIncluso = i.condicoes.includes('ALUGUEL_CONDOMINIO_INCLUSO');
            const iptuIncluso = i.condicoes.includes('ALUGUEL_IPTU_INCLUSO');
            linhas.push({ rotulo: 'Aluguel mensal', valor: brl(i.preco), destaque: true });
            linhas.push({ rotulo: 'Condomínio', valor: condIncluso ? 'Incluso' : i.condominio ? brl(i.condominio) : 'Não informado' });
            linhas.push({ rotulo: 'IPTU', valor: iptuIncluso ? 'Incluso' : i.iptu ? brl(i.iptu) : 'Não informado' });
            const somaCond = !condIncluso && i.condominio ? i.condominio : 0;
            linhas.push({ rotulo: 'Aluguel + condomínio', valor: brl(i.preco + somaCond), nota: 'sem IPTU e contas de consumo' });
            if (i.contratoMinimoMeses) linhas.push({ rotulo: 'Contrato mínimo', valor: `${i.contratoMinimoMeses} meses` });
        } else {
            linhas.push({ rotulo: 'Valor da diária', valor: brl(i.preco), destaque: true });
            linhas.push({ rotulo: 'Taxa de limpeza', valor: i.taxaLimpeza ? brl(i.taxaLimpeza) : i.taxaLimpeza === 0 ? 'Sem taxa' : 'Não informada', nota: i.taxaLimpeza ? 'cobrada uma vez' : undefined });
            if (i.noitesMinimas) {
                linhas.push({ rotulo: 'Mínimo de noites', valor: String(i.noitesMinimas) });
                linhas.push({ rotulo: 'Estadia mínima', valor: brl(i.preco * i.noitesMinimas + (i.taxaLimpeza ?? 0)), nota: `${i.noitesMinimas} noites + limpeza` });
            }
            if (i.horarioCheckin) linhas.push({ rotulo: 'Check-in', valor: `a partir das ${i.horarioCheckin}` });
            if (i.horarioCheckout) linhas.push({ rotulo: 'Check-out', valor: `até as ${i.horarioCheckout}` });
        }
        return linhas;
    });

    /** Valor principal (venda, aluguel ou diária), mostrado ao lado do endereço. */
    principal = computed(() => this.valores().find((v) => v.destaque) ?? null);
    secundarios = computed(() => this.valores().filter((v) => !v.destaque));

    /** Condições da finalidade: na venda inclui pagamento e documentação; marcadas e não marcadas aparecem. */
    condicoes = computed<GrupoCondicao[]>(() => {
        const i = this.imovel();
        if (!i) return [];
        const grupos: GrupoCondicao[] = [];
        if (i.finalidade === 'VENDA') {
            // pagamento e documentos numa linha só: a venda tem mais condições e a folha é uma página
            grupos.push({ titulo: 'Pagamento e documentos', itens: DOCUMENTACAO.map((d) => ({ label: d.label, sim: !!i[d.campo] })) });
        }
        // na venda as não marcadas também informam (riscadas); no aluguel e na temporada só o que vale
        const todas = i.finalidade === 'VENDA';
        for (const g of CONDICOES[i.finalidade]) {
            const itens = g.itens.map((c) => ({ label: c.label, sim: i.condicoes.includes(c.codigo) })).filter((c) => todas || c.sim);
            if (itens.length) grupos.push({ titulo: g.titulo, itens });
        }
        return grupos;
    });

    /**
     * Ajusta a descrição ao espaço livre da folha (altura fixa de A4): mede quanto sobra na seção "Sobre o imóvel"
     * e define quantas linhas mostrar, terminando em reticências. Chamado depois que fontes e fotos carregaram.
     */
    ajustarDescricao() {
        const caixa = this.host.nativeElement.querySelector<HTMLElement>('.fo-sobre');
        const texto = caixa?.querySelector<HTMLElement>('.fo-sobre__texto');
        if (!caixa || !texto) return;
        const linha = parseFloat(getComputedStyle(texto).lineHeight) || 14;
        // espaço do texto = fim da seção - início do parágrafo - o que vem depois dele (destaques)
        const depois = Array.from(caixa.children)
            .filter((el) => texto.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
            .reduce((soma, el) => soma + (el as HTMLElement).offsetHeight + parseFloat(getComputedStyle(el).marginTop), 0);
        // a seção tem altura mínima e pode passar do corpo da folha, que corta o excesso: vale o menor dos dois
        const fim = Math.min(caixa.getBoundingClientRect().bottom, caixa.closest('.fo-corpo')?.getBoundingClientRect().bottom ?? Infinity);
        const livre = fim - texto.getBoundingClientRect().top - depois;
        this.linhasDescricao.set(Math.max(1, Math.floor(livre / linha)));
    }
}
