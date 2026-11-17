package br.com.chfb.imoveis.platform.documento;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentoAceiteRepository extends JpaRepository<DocumentoAceite, Long> {

    boolean existsByDocumentoIdAndUsuarioIdAndVersao(Long documentoId, Long usuarioId, int versao);

    long countByDocumentoIdAndVersao(Long documentoId, int versao);

    long countByDocumentoId(Long documentoId);

    /** [documentoId, versão] de cada aceite do usuário entre os documentos informados. */
    @Query("select a.documentoId, a.versao from DocumentoAceite a where a.usuarioId = :usuario and a.documentoId in :ids")
    List<Object[]> aceitosPor(@Param("usuario") Long usuarioId, @Param("ids") Collection<Long> documentoIds);
}
