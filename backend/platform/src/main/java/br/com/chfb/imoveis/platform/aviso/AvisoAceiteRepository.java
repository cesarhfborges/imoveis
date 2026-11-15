package br.com.chfb.imoveis.platform.aviso;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AvisoAceiteRepository extends JpaRepository<AvisoAceite, Long> {

    Optional<AvisoAceite> findByAvisoIdAndUsuarioId(Long avisoId, Long usuarioId);

    List<AvisoAceite> findByUsuarioIdAndAvisoIdIn(Long usuarioId, Collection<Long> avisoIds);

    /** Quantos usuários aceitaram a versão atual (para o painel). */
    @Query("select count(a) from AvisoAceite a where a.avisoId = :aviso and a.versao = :versao")
    long aceitesDaVersao(@Param("aviso") Long avisoId, @Param("versao") int versao);
}
