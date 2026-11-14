package br.com.chfb.imoveis.listing.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.chfb.imoveis.listing.entity.Favorito;

public interface FavoritoRepository extends JpaRepository<Favorito, Long> {

    @EntityGraph(attributePaths = "imovel")
    List<Favorito> findByUsuarioIdOrderByCriadoEmDesc(Long usuarioId);

    Optional<Favorito> findByUsuarioIdAndImovelId(Long usuarioId, Long imovelId);

    @Query("select f.imovel.id from Favorito f where f.usuarioId = :usuarioId")
    List<Long> idsFavoritos(@Param("usuarioId") Long usuarioId);

    void deleteByImovelId(Long imovelId);
}
