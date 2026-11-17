import { ApplicationRef, EnvironmentInjector, Injectable, createComponent, inject } from '@angular/core';
import { ImovelDetalhe } from '@/app/core/models/models';
import { ConfigService } from '@/app/core/services/config.service';
import { FichaImovel } from '@/app/shared/components/ficha-imovel';

/** A4 em milímetros. */
const LARGURA_MM = 210;
const ALTURA_MM = 297;
/** Resolução da captura: 3x os 96 dpi da tela ≈ 290 dpi no papel. */
const ESCALA = 3;
/** Espera máxima por fotos lentas antes de gerar com o que tiver carregado. */
const LIMITE_FOTOS_MS = 6000;

function paraDataUrl(arquivo: Blob): Promise<string> {
    return new Promise((ok, falha) => {
        const leitor = new FileReader();
        leitor.onload = () => ok(String(leitor.result));
        leitor.onerror = () => falha(leitor.error);
        leitor.readAsDataURL(arquivo);
    });
}

/**
 * Gera a ficha do imóvel em PDF no próprio navegador e manda direto para a impressão, sem abrir página editável:
 * desenha o FichaImovel fora da tela, captura a folha como imagem (html-to-image, que usa o motor do próprio
 * navegador e por isso sai igual ao layout), monta um PDF A4 (jsPDF) e imprime por um iframe oculto.
 * As bibliotecas são carregadas só no primeiro uso, para não pesar na página do imóvel.
 */
@Injectable({ providedIn: 'root' })
export class FichaPdfService {
    private appRef = inject(ApplicationRef);
    private injector = inject(EnvironmentInjector);
    private config = inject(ConfigService);
    private urlAnterior: string | null = null;

    /** Gera o PDF e abre o diálogo de impressão. */
    async imprimir(imovel: ImovelDetalhe): Promise<void> {
        const pdf = await this.gerar(imovel);
        this.enviarParaImpressao(pdf, `ficha-${imovel.codigo}.pdf`);
    }

    /** PDF A4 de uma página com a ficha do imóvel. */
    async gerar(imovel: ImovelDetalhe): Promise<Blob> {
        const [{ toJpeg }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
        const palco = document.createElement('div');
        // fora da tela, mas renderizado (display: none não teria layout para medir e capturar)
        palco.setAttribute('aria-hidden', 'true');
        palco.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;';
        document.body.appendChild(palco);
        const ref = createComponent(FichaImovel, { environmentInjector: this.injector, hostElement: palco.appendChild(document.createElement('app-ficha-imovel')) });
        try {
            const c = this.config.config();
            ref.setInput('imovel', imovel);
            ref.setInput('nomeSite', c.nomeApp);
            ref.setInput('logoUrl', c.logoUrl);
            this.appRef.attachView(ref.hostView);
            ref.changeDetectorRef.detectChanges();

            const folha = ref.location.nativeElement.querySelector('.folha') as HTMLElement;
            await this.esperarCarregar(folha);
            ref.instance.ajustarDescricao();
            ref.changeDetectorRef.detectChanges();

            const imagem = await toJpeg(folha, { quality: 0.92, pixelRatio: ESCALA, backgroundColor: '#ffffff', cacheBust: false, fontEmbedCSS: await this.fontes() });
            const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
            doc.setProperties({ title: `Ficha do imóvel ${imovel.codigo}`, subject: c.nomeApp, creator: c.nomeApp });
            doc.addImage(imagem, 'JPEG', 0, 0, LARGURA_MM, ALTURA_MM, undefined, 'FAST');
            return doc.output('blob');
        } finally {
            this.appRef.detachView(ref.hostView);
            ref.destroy();
            palco.remove();
        }
    }

    /**
     * @font-face das fontes do site com os arquivos embutidos (data URL), para a captura usar a mesma letra da tela.
     * O html-to-image não consegue ler sozinho o CSS do Google Fonts (outra origem), então juntamos aqui: as regras
     * das folhas do próprio site (ex.: PrimeIcons) e o CSS do Google Fonts baixado por fetch (que libera CORS),
     * só com o subconjunto latino, que cobre o português. Calculado uma vez por visita.
     */
    private fontes(): Promise<string> {
        this.fontesCss ??= this.montarFontes().catch(() => '');
        return this.fontesCss;
    }

    private fontesCss?: Promise<string>;

    private async montarFontes(): Promise<string> {
        const blocos: { css: string; base: string }[] = [];
        for (const folha of Array.from(document.styleSheets)) {
            const base = folha.href ?? location.href;
            try {
                for (const regra of Array.from(folha.cssRules)) {
                    if (regra instanceof CSSFontFaceRule) blocos.push({ css: regra.cssText, base });
                }
            } catch {
                // folha de outra origem (Google Fonts): baixa o texto e fica só com as faces do subconjunto latino
                if (!folha.href) continue;
                const texto = await (await fetch(folha.href)).text();
                for (const face of texto.match(/@font-face\s*{[^}]*}/g) ?? []) {
                    if (/unicode-range:[^;]*U\+0000-00FF/i.test(face)) blocos.push({ css: face, base });
                }
            }
        }
        const embutidas = await Promise.all(
            blocos.map(async ({ css, base }) => {
                let saida = css;
                for (const [trecho, endereco] of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
                    if (endereco.startsWith('data:')) continue;
                    const arquivo = await (await fetch(new URL(endereco, base))).blob();
                    saida = saida.replace(trecho, `url("${await paraDataUrl(arquivo)}")`);
                }
                return saida;
            })
        );
        return embutidas.join('\n');
    }

    /** Fontes e fotos carregadas (ou o limite de espera), para a captura não sair com buracos. */
    private async esperarCarregar(folha: HTMLElement) {
        const carregada = (img: HTMLImageElement) =>
            img.complete
                ? Promise.resolve()
                : new Promise<void>((ok) => {
                      img.addEventListener('load', () => ok(), { once: true });
                      img.addEventListener('error', () => ok(), { once: true });
                  });
        const imagens = Array.from(folha.querySelectorAll('img'));
        const limite = new Promise<void>((ok) => setTimeout(ok, LIMITE_FOTOS_MS));
        await Promise.race([Promise.all([document.fonts.ready, ...imagens.map(carregada)]), limite]);
    }

    /**
     * Imprime o PDF por um iframe oculto. Se o navegador não deixar (alguns móveis e o Safari), abre o PDF numa
     * aba do visualizador de PDF, onde a pessoa imprime ou salva.
     */
    private enviarParaImpressao(pdf: Blob, nome: string) {
        if (this.urlAnterior) URL.revokeObjectURL(this.urlAnterior);
        document.getElementById('ficha-pdf-impressao')?.remove();
        const url = URL.createObjectURL(new File([pdf], nome, { type: 'application/pdf' }));
        this.urlAnterior = url;

        const quadro = document.createElement('iframe');
        quadro.id = 'ficha-pdf-impressao';
        quadro.title = 'Ficha do imóvel para impressão';
        quadro.setAttribute('aria-hidden', 'true');
        quadro.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
        quadro.onload = () => {
            try {
                quadro.contentWindow?.focus();
                quadro.contentWindow?.print();
            } catch {
                window.open(url, '_blank', 'noopener');
            }
        };
        quadro.src = url;
        document.body.appendChild(quadro);
    }
}
