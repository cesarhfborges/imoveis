package br.com.chfb.imoveis.sharedkernel.dto;

import java.time.Instant;
import java.util.Map;

/** Corpo padrão de erro devolvido por todas as rotas. */
public record ApiError(Instant timestamp, int status, String error, String message, String path, Map<String, String> fields) {

    public static ApiError of(int status, String error, String message, String path) {
        return new ApiError(Instant.now(), status, error, message, path, Map.of());
    }
}
