import { Contato, ImovelDetalhe } from '@/app/core/models/models';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export interface DadosResposta {
    contato: Contato;
    /** Detalhes do imóvel; sem eles a mensagem usa só título e código. */
    imovel: ImovelDetalhe | null;
    /** Endereço público do anúncio. */
    link: string;
    /** Nome do portal (configuração do site). */
    site: string;
    /** Quem responde (nome do usuário logado). */
    assinatura: string;
}

function primeiroNome(nome: string) {
    return nome.trim().split(/\s+/)[0] ?? '';
}

function plural(n: number, um: string, varios: string) {
    return `${n} ${n === 1 ? um : varios}`;
}

/** Linhas de detalhe do imóvel (sem marcador), na ordem em que aparecem na mensagem. */
function detalhes(i: ImovelDetalhe, emoji: boolean) {
    const e = (s: string) => (emoji ? s + ' ' : '• ');
    const linhas: string[] = [];

    const local = [i.bairro, i.cidade && i.uf ? `${i.cidade}/${i.uf}` : i.cidade].filter(Boolean).join(', ');
    if (local) linhas.push(e('📍') + local);

    const sufixo = i.finalidade === 'ALUGUEL' ? '/mês' : i.finalidade === 'TEMPORADA' ? '/dia' : '';
    let valor = i.preco ? BRL.format(i.preco) + sufixo : 'Valor sob consulta';
    const extras = [i.condominio ? `condomínio ${BRL.format(i.condominio)}` : null, i.iptu ? `IPTU ${BRL.format(i.iptu)}` : null].filter(Boolean);
    if (extras.length) valor += ` (${extras.join(' · ')})`;
    linhas.push(e('💰') + valor);

    const ficha = [
        i.areaUtil ? `${NUM.format(i.areaUtil)} m²` : null,
        i.quartos ? plural(i.quartos, 'quarto', 'quartos') + (i.suites ? ` (${plural(i.suites, 'suíte', 'suítes')})` : '') : null,
        i.banheiros ? plural(i.banheiros, 'banheiro', 'banheiros') : null,
        i.vagas ? plural(i.vagas, 'vaga', 'vagas') : null
    ].filter(Boolean);
    if (ficha.length) linhas.push(e('📐') + ficha.join(' · '));

    const condicoes = [i.aceitaFinanciamento ? 'aceita financiamento' : null, i.aceitaFgts ? 'aceita FGTS' : null, i.aceitaPermuta ? 'aceita permuta' : null, i.quitado ? 'quitado' : null, i.escrituraRegistrada ? 'escritura registrada' : null].filter(
        Boolean
    ) as string[];
    if (condicoes.length) {
        const txt = condicoes.join(', ');
        linhas.push(e('✅') + txt[0].toUpperCase() + txt.slice(1));
    }
    return linhas;
}

function corpo(d: DadosResposta, whatsapp: boolean) {
    const { contato: c, imovel: i } = d;
    const negrito = (s: string) => (whatsapp ? `*${s}*` : s);
    const titulo = i?.titulo ?? c.imovelTitulo;
    const codigo = i?.codigo ?? c.imovelCodigo;

    const partes = [
        `Olá, ${primeiroNome(c.nome)}! Tudo bem?`,
        '',
        `Obrigado pelo seu interesse no imóvel que você viu no site ${d.site}:`,
        '',
        `${whatsapp ? '🏠 ' : ''}${negrito(titulo)} (cód. ${codigo})`,
        ...(i ? detalhes(i, whatsapp) : []),
        '',
        `Veja todas as fotos e detalhes do anúncio:`,
        d.link,
        '',
        'Fico à disposição para tirar suas dúvidas ou agendar uma visita. Qual o melhor dia e horário para você?'
    ];
    if (d.assinatura) partes.push('', 'Atenciosamente,', d.assinatura);
    return partes;
}

/** Assunto e corpo do e-mail de resposta (com a mensagem original citada no fim). */
export function respostaEmail(d: DadosResposta) {
    const c = d.contato;
    const citacao = c.mensagem
        .split('\n')
        .map((l) => '> ' + l)
        .join('\n');
    return {
        assunto: `Re: ${d.imovel?.titulo ?? c.imovelTitulo} (cód. ${d.imovel?.codigo ?? c.imovelCodigo})`,
        corpo: [...corpo(d, false), '', '', `Em resposta à sua mensagem:`, citacao].join('\n')
    };
}

/** Texto da mensagem do WhatsApp (negrito com *...* e emojis). */
export function respostaWhatsapp(d: DadosResposta) {
    return corpo(d, true).join('\n');
}
