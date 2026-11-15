package br.com.chfb.imoveis.moderation.entity;

import java.text.Normalizer;
import java.util.Locale;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * Gravidade de denúncia (cadastrável), com a regra de banimento automático da conta do anunciante:
 * depois de {@code banirApos} denúncias procedentes desta gravidade nos últimos {@code janelaMeses} meses
 * (nulo = todo o histórico), a conta é banida — se {@code banirContaAuto} estiver ligado.
 */
@Entity
@Table(name = "gravidades")
public class Gravidade extends BaseEntity {

    @Column(nullable = false, length = 40)
    private String nome;

    @Column(name = "nome_normalizado", nullable = false, length = 40)
    private String nomeNormalizado;

    @Column(nullable = false, length = 12)
    private String cor = "info";

    private int ordem;

    private boolean ativo = true;

    @Column(name = "banir_conta_auto")
    private boolean banirContaAuto;

    @Column(name = "banir_apos")
    private Integer banirApos;

    @Column(name = "janela_meses")
    private Integer janelaMeses;

    /** Nome limpo: sem espaços nas pontas e com espaços internos simples. */
    public static String limpar(String nome) {
        return nome == null ? "" : nome.strip().replaceAll("\\s+", " ");
    }

    /** Chave de comparação: "Gráve ", "grave" e "GRAVE" viram "grave". */
    public static String normalizar(String nome) {
        String semAcento = Normalizer.normalize(limpar(nome), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return semAcento.toLowerCase(Locale.ROOT);
    }

    public String getNome() { return nome; }
    public void setNome(String nome) {
        this.nome = limpar(nome);
        this.nomeNormalizado = normalizar(nome);
    }
    public String getNomeNormalizado() { return nomeNormalizado; }
    public String getCor() { return cor; }
    public void setCor(String cor) { this.cor = cor; }
    public int getOrdem() { return ordem; }
    public void setOrdem(int ordem) { this.ordem = ordem; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public boolean isBanirContaAuto() { return banirContaAuto; }
    public void setBanirContaAuto(boolean banirContaAuto) { this.banirContaAuto = banirContaAuto; }
    public Integer getBanirApos() { return banirApos; }
    public void setBanirApos(Integer banirApos) { this.banirApos = banirApos; }
    public Integer getJanelaMeses() { return janelaMeses; }
    public void setJanelaMeses(Integer janelaMeses) { this.janelaMeses = janelaMeses; }
}
