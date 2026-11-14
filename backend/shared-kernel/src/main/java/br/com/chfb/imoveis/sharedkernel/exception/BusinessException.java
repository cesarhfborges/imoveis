package br.com.chfb.imoveis.sharedkernel.exception;

/** Erro de regra de negócio, devolvido ao cliente com o status informado. */
public class BusinessException extends RuntimeException {

    private final int status;

    public BusinessException(String message) {
        this(400, message);
    }

    public BusinessException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}
