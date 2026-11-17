package br.com.chfb.imoveis.platform.documento;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoVersaoRepository extends JpaRepository<DocumentoVersao, Long> {

    List<DocumentoVersao> findByDocumentoIdOrderByVersaoDesc(Long documentoId);

    Optional<DocumentoVersao> findByDocumentoIdAndVersao(Long documentoId, int versao);
}
