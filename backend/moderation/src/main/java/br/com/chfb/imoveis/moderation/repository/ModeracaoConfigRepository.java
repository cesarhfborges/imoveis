package br.com.chfb.imoveis.moderation.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.chfb.imoveis.moderation.entity.ModeracaoConfig;

public interface ModeracaoConfigRepository extends JpaRepository<ModeracaoConfig, Short> {
}
