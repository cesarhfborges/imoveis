package br.com.chfb.imoveis.sharedkernel.util;

/**
 * Campos com formato (CEP, CPF, CNPJ, telefone) são gravados só com os dígitos;
 * a formatação é papel do front (pipes cep, documento e telefone).
 */
public final class Digitos {

    private Digitos() {
    }

    /** "(61) 99999-8888" → "61999998888"; nulo, vazio ou sem dígitos → null. */
    public static String somente(String valor) {
        if (valor == null) {
            return null;
        }
        String d = valor.replaceAll("\\D", "");
        return d.isEmpty() ? null : d;
    }
}
