package br.com.chfb.imoveis.platform.documento;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Texto de uma versão publicada do documento (o que cada pessoa aceitou). */
@Entity
@Table(name = "documento_versoes")
public class DocumentoVersao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "documento_id", nullable = false)
    private Long documentoId;

    private int versao;

    @Column(nullable = false, length = 120)
    private String titulo;

    @Column(nullable = false, columnDefinition = "text")
    private String conteudo;

    @Column(length = 300)
    private String nota;

    @Column(name = "publicado_por")
    private Long publicadoPor;

    @Column(name = "publicado_em", nullable = false)
    private Instant publicadoEm = Instant.now();

    public Long getId() { return id; }
    public Long getDocumentoId() { return documentoId; }
    public void setDocumentoId(Long documentoId) { this.documentoId = documentoId; }
    public int getVersao() { return versao; }
    public void setVersao(int versao) { this.versao = versao; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getConteudo() { return conteudo; }
    public void setConteudo(String conteudo) { this.conteudo = conteudo; }
    public String getNota() { return nota; }
    public void setNota(String nota) { this.nota = nota; }
    public Long getPublicadoPor() { return publicadoPor; }
    public void setPublicadoPor(Long publicadoPor) { this.publicadoPor = publicadoPor; }
    public Instant getPublicadoEm() { return publicadoEm; }
    public void setPublicadoEm(Instant publicadoEm) { this.publicadoEm = publicadoEm; }
}
