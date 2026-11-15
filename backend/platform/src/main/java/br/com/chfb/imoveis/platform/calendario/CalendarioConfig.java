package br.com.chfb.imoveis.platform.calendario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Configuração do calendário (linha única). */
@Entity
@Table(name = "calendario_config")
public class CalendarioConfig {

    @Id
    private Short id = 1;

    @Column(nullable = false, length = 60)
    private String fuso;

    public Short getId() { return id; }
    public String getFuso() { return fuso; }
    public void setFuso(String fuso) { this.fuso = fuso; }
}
