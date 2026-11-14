package br.com.chfb.imoveis.coreapi.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import br.com.chfb.imoveis.sharedkernel.dto.ApiError;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;

/** Converte exceções de todos os módulos no corpo padrão {@link ApiError}. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ApiError> negocio(BusinessException ex, HttpServletRequest req) {
        HttpStatus status = HttpStatus.resolve(ex.getStatus());
        status = status == null ? HttpStatus.BAD_REQUEST : status;
        return ResponseEntity.status(status).body(ApiError.of(status.value(), status.getReasonPhrase(), ex.getMessage(),
                req.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validacao(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> campos = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            campos.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(new ApiError(Instant.now(), 400, "Bad Request",
                "Verifique os campos informados", req.getRequestURI(), campos));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiError> leitura(Exception ex, HttpServletRequest req) {
        return ResponseEntity.badRequest()
                .body(ApiError.of(400, "Bad Request", "Requisição inválida", req.getRequestURI()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> tamanho(MaxUploadSizeExceededException ex, HttpServletRequest req) {
        return ResponseEntity.status(413)
                .body(ApiError.of(413, "Payload Too Large", "Arquivo maior que o permitido", req.getRequestURI()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> negado(AccessDeniedException ex, HttpServletRequest req) {
        return ResponseEntity.status(403)
                .body(ApiError.of(403, "Forbidden", "Seu perfil não tem acesso a este recurso.", req.getRequestURI()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> naoEncontrado(NoResourceFoundException ex, HttpServletRequest req) {
        return ResponseEntity.status(404).body(ApiError.of(404, "Not Found", "Recurso não encontrado", req.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> inesperado(Exception ex, HttpServletRequest req) {
        log.error("Erro inesperado em {}", req.getRequestURI(), ex);
        return ResponseEntity.internalServerError()
                .body(ApiError.of(500, "Internal Server Error", "Erro inesperado. Tente novamente.", req.getRequestURI()));
    }
}
