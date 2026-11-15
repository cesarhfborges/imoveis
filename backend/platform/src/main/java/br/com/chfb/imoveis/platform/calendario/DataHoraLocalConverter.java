package br.com.chfb.imoveis.platform.calendario;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Data/hora local (sem fuso) gravada como texto "aaaa-mm-ddThh:mm". Evita que o driver/Hibernate converta
 * o valor pelo fuso da JVM: o feriado "24/12 às 13:00" continua 13:00 em qualquer servidor.
 */
@Converter
public class DataHoraLocalConverter implements AttributeConverter<LocalDateTime, String> {

    private static final DateTimeFormatter FORMATO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    @Override
    public String convertToDatabaseColumn(LocalDateTime valor) {
        return valor == null ? null : FORMATO.format(valor.truncatedTo(ChronoUnit.MINUTES));
    }

    @Override
    public LocalDateTime convertToEntityAttribute(String texto) {
        return texto == null ? null : LocalDateTime.parse(texto, FORMATO);
    }
}
