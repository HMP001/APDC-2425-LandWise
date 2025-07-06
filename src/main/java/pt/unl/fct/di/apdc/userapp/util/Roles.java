package pt.unl.fct.di.apdc.userapp.util;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class Roles {

    // === DEFINIÇÃO DE ROLES COMO CONSTANTES ===
    public static final String SYSADMIN = "SYSADMIN";
    public static final String SYSBO = "SYSBO";
    public static final String SMBO = "SMBO";
    public static final String SGVBO = "SGVBO";
    public static final String SDVBO = "SDVBO";
    public static final String PRBO = "PRBO";
    public static final String PO = "PO";
    public static final String ADLU = "ADLU";
    public static final String RU = "RU";
    public static final String VU = "VU";

    // === GRUPOS DE ROLES POR CATEGORIA ===
    public static final Set<String> SYS_ROLES = Set.of(SYSADMIN, SYSBO);
    public static final Set<String> BO_ROLES = Set.of(SMBO, SGVBO, SDVBO);
    public static final Set<String> PARTNER_ROLES = Set.of(PRBO, PO);
    public static final Set<String> USER_ROLES = Set.of(ADLU, RU, VU);

    public static final Set<String> ALL_ROLES = new HashSet<>();
    static {
        ALL_ROLES.addAll(SYS_ROLES);
        ALL_ROLES.addAll(BO_ROLES);
        ALL_ROLES.addAll(PARTNER_ROLES);
        ALL_ROLES.addAll(USER_ROLES);
    }

    // === VERIFICA SE O ROLE ESTÁ ENTRE OS ACEITES ===
    public static boolean hasAccess(String role, Set<String> allowedRoles) {
        return role != null && allowedRoles.contains(role.toUpperCase());
    }

    // === VERIFICA SE O ROLE É UM DOS ENUMERADOS ===
    public static boolean is(String role, String... accepted) {
        if (role == null) return false;
        return Arrays.stream(accepted)
                     .map(String::toUpperCase)
                     .anyMatch(r -> r.equals(role.toUpperCase()));
    }

    // === VALIDA SE UM ROLE É UM DOS CONHECIDOS NO SISTEMA ===
    public static boolean isValidRole(String role) {
        return role != null && ALL_ROLES.contains(role.toUpperCase());
    }
}
