package br.com.chfb.imoveis.platform.aviso;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Aceite de um aviso por um usuário logado: guarda a versão mais recente aceita (e quando). */
@Entity
@Table(name = "aviso_aceites")
public class AvisoAceite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "aviso_id", nullable = false)
    private Long avisoId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    private int versao;

    @Column(name = "aceito_em", nullable = false)
    private Instant aceitoEm;

    public Long getId() { return id; }
    public Long getAvisoId() { return avisoId; }
    public void setAvisoId(Long avisoId) { this.avisoId = avisoId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public int getVersao() { return versao; }
    public void setVersao(int versao) { this.versao = versao; }
    public Instant getAceitoEm() { return aceitoEm; }
    public void setAceitoEm(Instant aceitoEm) { this.aceitoEm = aceitoEm; }
}
