package br.com.chfb.imoveis.platform.calendario;

import java.time.LocalDateTime;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Feriado ou parada: intervalo de data/hora (no fuso do calendário) em que prazos úteis não correm. */
@Entity
@Table(name = "calendario_feriados")
public class Feriado extends BaseEntity {

    @Column(nullable = false, length = 120)
    private String titulo;

    @Convert(converter = DataHoraLocalConverter.class)
    @Column(nullable = false, length = 16)
    private LocalDateTime inicio;

    @Convert(converter = DataHoraLocalConverter.class)
    @Column(nullable = false, length = 16)
    private LocalDateTime fim;

    /** Repete todo ano na mesma data/hora (ex.: Natal). */
    private boolean recorrente;

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public LocalDateTime getInicio() { return inicio; }
    public void setInicio(LocalDateTime inicio) { this.inicio = inicio; }
    public LocalDateTime getFim() { return fim; }
    public void setFim(LocalDateTime fim) { this.fim = fim; }
    public boolean isRecorrente() { return recorrente; }
    public void setRecorrente(boolean recorrente) { this.recorrente = recorrente; }
}
