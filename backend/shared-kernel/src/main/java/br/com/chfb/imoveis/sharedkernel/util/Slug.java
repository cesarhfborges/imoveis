package br.com.chfb.imoveis.sharedkernel.util;

import java.text.Normalizer;
import java.util.Locale;

/** Texto para URL amigável, igual ao {@code slug()} do front: "Casa com piscina" → "casa-com-piscina". */
public final class Slug {

    private Slug() {
    }

    public static String de(String texto) {
        if (texto == null) {
            return "";
        }
        String s = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        return s.length() > 80 ? s.substring(0, 80) : s;
    }
}
