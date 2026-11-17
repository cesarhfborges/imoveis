package br.com.chfb.imoveis.coreapi.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.chfb.imoveis.coreapi.entity.Usuario;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByIdAndAtivoTrue(Long id);

    @Query("select distinct u.id from Usuario u join u.papeis p where p = :papel and u.ativo = true")
    List<Long> idsAtivosPorPapel(@Param("papel") Perfil papel);

    /** Anunciantes ativos com o perfil público ligado (diretório /imobiliarias). */
    @Query("select distinct u from Usuario u join u.papeis p where p = :papel and u.ativo = true and u.perfilPublico = true")
    List<Usuario> perfisPublicos(@Param("papel") Perfil papel);

    /** Novos cadastros por dia (no fuso informado) a partir de {@code inicio}: [dia, quantidade]. */
    @Query(value = """
            select cast(u.criado_em at time zone :fuso as date), count(*) from usuarios u
            where u.criado_em >= :inicio group by 1
            """, nativeQuery = true)
    List<Object[]> cadastrosPorDia(@Param("inicio") Instant inicio, @Param("fuso") String fuso);

    @Query("select count(distinct u) from Usuario u join u.papeis p where p = :papel")
    long contarPorPapel(@Param("papel") Perfil papel);

    @Query(value = """
            select distinct u from Usuario u left join u.papeis p
            where (lower(u.nome) like :q or lower(u.email) like :q)
              and (:papel is null or p = :papel)
            """,
            countQuery = """
            select count(distinct u) from Usuario u left join u.papeis p
            where (lower(u.nome) like :q or lower(u.email) like :q)
              and (:papel is null or p = :papel)
            """)
    Page<Usuario> buscar(@Param("q") String q, @Param("papel") Perfil papel, Pageable pageable);
}
