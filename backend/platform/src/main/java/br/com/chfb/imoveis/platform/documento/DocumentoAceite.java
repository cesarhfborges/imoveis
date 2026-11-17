package br.com.chfb.imoveis.platform.documento;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Comprovação de que o usuário aceitou uma versão do documento. */
@Entity
@Table(name = "documento_aceites")
public class DocumentoAceite {

    public enum Origem { CADASTRO, CONTA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "documento_id", nullable = false)
    private Long documentoId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    private int versao;

    @Column(nullable = false, length = 10)
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    private Origem origem;

    @Column(length = 45)
    private String ip;

    @Column(name = "aceito_em", nullable = false)
    private Instant aceitoEm = Instant.now();

    public static DocumentoAceite de(Documento d, Long usuarioId, Origem origem, String ip) {
        DocumentoAceite a = new DocumentoAceite();
        a.documentoId = d.getId();
        a.usuarioId = usuarioId;
        a.versao = d.getVersao();
        a.origem = origem;
        a.ip = ip == null ? null : ip.substring(0, Math.min(45, ip.length()));
        return a;
    }

    public Long getId() { return id; }
    public Long getDocumentoId() { return documentoId; }
    public Long getUsuarioId() { return usuarioId; }
    public int getVersao() { return versao; }
    public Origem getOrigem() { return origem; }
    public String getIp() { return ip; }
    public Instant getAceitoEm() { return aceitoEm; }
}
