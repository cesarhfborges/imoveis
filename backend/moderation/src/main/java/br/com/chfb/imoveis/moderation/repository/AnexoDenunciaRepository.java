package br.com.chfb.imoveis.moderation.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.chfb.imoveis.moderation.entity.AnexoDenuncia;

public interface AnexoDenunciaRepository extends JpaRepository<AnexoDenuncia, String> {

    /** O anexo está numa mensagem visível ao anunciante (não interna) de uma denúncia de anúncio dele? */
    @Query(value = """
            select exists (
              select 1 from denuncia_mensagens m
                join denuncias d on d.id = m.denuncia_id
                join imoveis i on i.id = d.imovel_id
               where m.interna = false and i.anunciante_id = :usuario
                 and position(:url in coalesce(m.anexos, '')) > 0)
            """, nativeQuery = true)
    boolean visivelParaAnunciante(@Param("url") String url, @Param("usuario") Long usuarioId);

    List<AnexoDenuncia> findByUsuarioId(Long usuarioId);
}
