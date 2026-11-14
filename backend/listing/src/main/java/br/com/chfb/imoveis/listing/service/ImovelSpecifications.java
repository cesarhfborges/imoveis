package br.com.chfb.imoveis.listing.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import br.com.chfb.imoveis.listing.dto.ImovelFiltro;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import jakarta.persistence.criteria.Predicate;

/** Monta a consulta da busca a partir dos filtros informados. */
final class ImovelSpecifications {

    private ImovelSpecifications() {
    }

    static Specification<Imovel> de(ImovelFiltro f, StatusAnuncio statusFixo, Long anuncianteFixo) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();

            StatusAnuncio status = statusFixo != null ? statusFixo : f.status();
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            Long anunciante = anuncianteFixo != null ? anuncianteFixo : f.anunciante();
            if (anunciante != null) {
                p.add(cb.equal(root.get("anuncianteId"), anunciante));
            }
            if (f.finalidade() != null) {
                p.add(cb.equal(root.get("finalidade"), f.finalidade()));
            }
            if (f.tipo() != null && !f.tipo().isEmpty()) {
                p.add(root.get("tipo").in(f.tipo()));
            }
            if (StringUtils.hasText(f.uf())) {
                p.add(cb.equal(cb.upper(root.get("uf")), f.uf().trim().toUpperCase(Locale.ROOT)));
            }
            if (StringUtils.hasText(f.cidade())) {
                p.add(cb.equal(cb.lower(root.get("cidade")), f.cidade().trim().toLowerCase(Locale.ROOT)));
            }
            if (StringUtils.hasText(f.bairro())) {
                p.add(cb.equal(cb.lower(root.get("bairro")), f.bairro().trim().toLowerCase(Locale.ROOT)));
            }
            if (f.quartos() != null && f.quartos() > 0) {
                p.add(cb.greaterThanOrEqualTo(root.get("quartos"), f.quartos()));
            }
            if (f.vagas() != null && f.vagas() > 0) {
                p.add(cb.greaterThanOrEqualTo(root.get("vagas"), f.vagas()));
            }
            if (f.suites() != null && f.suites() > 0) {
                p.add(cb.greaterThanOrEqualTo(root.get("suites"), f.suites()));
            }
            if (f.precoMin() != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("preco"), f.precoMin()));
            }
            if (f.precoMax() != null) {
                p.add(cb.lessThanOrEqualTo(root.get("preco"), f.precoMax()));
            }
            if (f.areaMin() != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("areaUtil"), f.areaMin()));
            }
            if (f.areaMax() != null) {
                p.add(cb.lessThanOrEqualTo(root.get("areaUtil"), f.areaMax()));
            }
            if (Boolean.TRUE.equals(f.lancamento())) {
                p.add(cb.isTrue(root.get("lancamento")));
            }
            if (Boolean.TRUE.equals(f.destaque())) {
                p.add(cb.isTrue(root.get("destaque")));
            }
            if (StringUtils.hasText(f.q())) {
                String termo = f.q().trim().toLowerCase(Locale.ROOT);
                String like = "%" + termo.replace("%", "").replace("_", "") + "%";
                List<Predicate> texto = new ArrayList<>();
                texto.add(cb.like(cb.lower(root.get("titulo")), like));
                texto.add(cb.like(cb.lower(root.get("bairro")), like));
                texto.add(cb.like(cb.lower(root.get("cidade")), like));
                String digitos = termo.replaceAll("\\D", "");
                if (termo.startsWith("im-") && !digitos.isEmpty() && digitos.length() < 12) {
                    texto.add(cb.equal(root.get("id"), Long.parseLong(digitos)));
                }
                p.add(cb.or(texto.toArray(Predicate[]::new)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }
}
