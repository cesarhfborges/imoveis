package br.com.chfb.imoveis.moderation.entity;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Mensagem da conversa de uma denúncia (administração, anunciante ou registro do sistema). */
@Entity
@Table(name = "denuncia_mensagens")
public class DenunciaMensagem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "denuncia_id")
    private Denuncia denuncia;

    @Column(name = "autor_id")
    private Long autorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private PapelMensagem papel;

    @Column(nullable = false, columnDefinition = "text")
    private String texto;

    /** URLs dos anexos, uma por linha. */
    @Column(columnDefinition = "text")
    private String anexos;

    /** Nota interna: só administradores veem. */
    private boolean interna;

    public Denuncia getDenuncia() { return denuncia; }
    public void setDenuncia(Denuncia denuncia) { this.denuncia = denuncia; }
    public Long getAutorId() { return autorId; }
    public void setAutorId(Long autorId) { this.autorId = autorId; }
    public PapelMensagem getPapel() { return papel; }
    public void setPapel(PapelMensagem papel) { this.papel = papel; }
    public String getTexto() { return texto; }
    public void setTexto(String texto) { this.texto = texto; }
    public String getAnexos() { return anexos; }
    public void setAnexos(String anexos) { this.anexos = anexos; }
    public boolean isInterna() { return interna; }
    public void setInterna(boolean interna) { this.interna = interna; }
}
