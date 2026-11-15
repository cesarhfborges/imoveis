package br.com.chfb.imoveis.platform.calendario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Expediente de um dia da semana (ISO: 1 = segunda ... 7 = domingo). Horários em minutos desde 00:00
 * (0 a 1440, em que 1440 = 24:00), para não sofrerem conversão de fuso no banco.
 */
@Entity
@Table(name = "calendario_expediente")
public class ExpedienteDia {

    @Id
    @Column(name = "dia_semana")
    private Short diaSemana;

    private boolean ativo;

    @Column(name = "inicio_minuto", nullable = false)
    private short inicioMinuto;

    @Column(name = "fim_minuto", nullable = false)
    private short fimMinuto;

    public Short getDiaSemana() { return diaSemana; }
    public void setDiaSemana(Short diaSemana) { this.diaSemana = diaSemana; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public short getInicioMinuto() { return inicioMinuto; }
    public void setInicioMinuto(short inicioMinuto) { this.inicioMinuto = inicioMinuto; }
    public short getFimMinuto() { return fimMinuto; }
    public void setFimMinuto(short fimMinuto) { this.fimMinuto = fimMinuto; }
}
