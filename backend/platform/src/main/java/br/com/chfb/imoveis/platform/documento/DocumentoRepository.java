package br.com.chfb.imoveis.platform.documento;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentoRepository extends JpaRepository<Documento, Long> {

    @Query("select d from Documento d where d.excluidoEm is null order by d.ordem, d.titulo")
    List<Documento> naoExcluidos();

    @Query("select d from Documento d order by case when d.excluidoEm is null then 0 else 1 end, d.ordem, d.titulo")
    List<Documento> todos();

    @Query("select d from Documento d where d.ativo = true and d.excluidoEm is null order by d.ordem, d.titulo")
    List<Documento> ativos();

    @Query("select d from Documento d where d.slug = :slug and d.ativo = true and d.excluidoEm is null")
    Optional<Documento> ativoPorSlug(@Param("slug") String slug);

    @Query("select count(d) > 0 from Documento d where d.slug = :slug and d.excluidoEm is null and (:id is null or d.id <> :id)")
    boolean slugEmUso(@Param("slug") String slug, @Param("id") Long id);
}
