package br.com.chfb.imoveis.moderation.service;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.springframework.stereotype.Service;

import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.PrazoDto;
import br.com.chfb.imoveis.moderation.entity.Denuncia;
import br.com.chfb.imoveis.platform.calendario.CalendarioService;
import br.com.chfb.imoveis.platform.calendario.CalendarioUteis;

/** Prazos (SLA) das denúncias em minutos úteis, pelo calendário geral do sistema. */
@Service
public class PrazoService {

    private static final DateTimeFormatter FORMATO = DateTimeFormatter.ofPattern("dd/MM 'às' HH:mm", new Locale("pt", "BR"));

    private final CalendarioService calendario;

    public PrazoService(CalendarioService calendario) {
        this.calendario = calendario;
    }

    /** Começa um novo prazo de {@code minutos} úteis para o anunciante. */
    public void iniciar(Denuncia d, int minutos, Instant agora) {
        d.setSlaInicio(agora);
        d.setSlaMinutos(minutos);
        Instant prazo = calendario.somarMinutosUteis(agora, minutos);
        d.setPrazoEm(prazo);
        d.setMinutosRestantes(prazo == null ? null : (int) calendario.minutosUteisEntre(agora, prazo));
        d.setAvisoEnviado(false);
        d.setMinutosNaPausa(null);
    }

    /** Momento em que se completam {@code minutos} úteis a partir de {@code inicio} (nulo sem expediente). */
    public Instant somar(Instant inicio, int minutos) {
        return calendario.somarMinutosUteis(inicio, minutos);
    }

    /** O anunciante respondeu: o relógio para e guarda quanto faltava. */
    public void pausar(Denuncia d, Instant agora) {
        if (d.getPrazoEm() != null) {
            d.setMinutosNaPausa((int) Math.min(Integer.MAX_VALUE, calendario.minutosUteisEntre(agora, d.getPrazoEm())));
        }
        d.setPrazoEm(null);
        d.setMinutosRestantes(null);
    }

    /**
     * O caso voltou para o anunciante: o relógio retoma de onde parou. Se faltava menos que {@code minimo}
     * (ou nada), começa um prazo novo de {@code minimo} minutos.
     */
    public void retomar(Denuncia d, int minimo, Instant agora) {
        Integer resto = d.getMinutosNaPausa();
        if (resto == null || resto < minimo || d.getSlaMinutos() == null) {
            iniciar(d, minimo, agora);
            return;
        }
        Instant prazo = calendario.somarMinutosUteis(agora, resto);
        d.setPrazoEm(prazo);
        d.setMinutosRestantes(prazo == null ? null : resto);
        d.setMinutosNaPausa(null);
    }

    /** Para o relógio de vez (denúncia encerrada ou automação concluída). */
    public void parar(Denuncia d) {
        d.setPrazoEm(null);
        d.setMinutosRestantes(null);
        d.setMinutosNaPausa(null);
    }

    public PrazoDto dto(Denuncia d, Instant agora) {
        if (d.getPrazoEm() == null) {
            return new PrazoDto(null, d.getSlaMinutos(), null, false, false, null, d.getEtapa(), d.getMinutosNaPausa());
        }
        CalendarioUteis c = calendario.atual();
        long restantes = c.minutosUteisEntre(agora, d.getPrazoEm());
        boolean vencido = !agora.isBefore(d.getPrazoEm());
        boolean correndo = !vencido && c.emExpediente(agora);
        Instant retoma = vencido || correndo ? null : c.proximoMomentoUtil(agora);
        return new PrazoDto(d.getPrazoEm(), d.getSlaMinutos(), restantes, vencido, correndo, retoma, d.getEtapa(), null);
    }

    public long minutosRestantes(Denuncia d, Instant agora) {
        return d.getPrazoEm() == null ? 0 : calendario.minutosUteisEntre(agora, d.getPrazoEm());
    }

    /** "16/11 às 09:00", no fuso do calendário. */
    public String formatar(Instant instante) {
        if (instante == null) {
            return "sem prazo (não há expediente configurado)";
        }
        return FORMATO.format(instante.atZone(calendario.atual().fuso()));
    }

    /** Duração em horas e minutos úteis: "2 h 30 min úteis", "45 min úteis". */
    public static String duracao(long minutos) {
        long h = minutos / 60;
        long m = minutos % 60;
        if (h == 0) {
            return m + " min úteis";
        }
        return h + " h" + (m > 0 ? " " + m + " min" : "") + " úteis";
    }
}
