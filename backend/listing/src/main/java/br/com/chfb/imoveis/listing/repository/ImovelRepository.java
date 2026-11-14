package br.com.chfb.imoveis.listing.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;

public interface ImovelRepository extends JpaRepository<Imovel, Long>, JpaSpecificationExecutor<Imovel> {

    long countByStatus(StatusAnuncio status);

    long countByAnuncianteId(Long anuncianteId);

    long countByAnuncianteIdAndStatus(Long anuncianteId, StatusAnuncio status);

    @Query("select coalesce(sum(i.visualizacoes), 0) from Imovel i where i.anuncianteId = :anuncianteId")
    long somarVisualizacoes(@Param("anuncianteId") Long anuncianteId);

    @Query("select coalesce(sum(i.visualizacoes), 0) from Imovel i")
    long somarVisualizacoes();

    @Query("select distinct i.uf, i.cidade, i.bairro from Imovel i where i.status = :status order by i.uf, i.cidade, i.bairro")
    List<Object[]> localidades(@Param("status") StatusAnuncio status);

    @Modifying
    @Query("update Imovel i set i.visualizacoes = i.visualizacoes + 1 where i.id = :id")
    void incrementarVisualizacoes(@Param("id") Long id);
}
