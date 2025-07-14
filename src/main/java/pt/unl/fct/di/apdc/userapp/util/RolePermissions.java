package pt.unl.fct.di.apdc.userapp.util;

import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.Collections;

public class RolePermissions {

    private static final Map<String, Integer> ROLE_PRIORITY = new HashMap<>();

    private static final Map<String, Set<String>> ROLE_ACTIONS = new HashMap<>();

    private static final Map<String, Set<String>> VIEW_PERMISSIONS = new HashMap<>();

    static {
        ROLE_PRIORITY.put(Roles.SYSADMIN, 0);
        ROLE_PRIORITY.put(Roles.SYSBO, 1);
        ROLE_PRIORITY.put(Roles.SMBO, 2);
        ROLE_PRIORITY.put(Roles.SGVBO, 3);
        ROLE_PRIORITY.put(Roles.SDVBO, 4);
        ROLE_PRIORITY.put(Roles.PRBO, 5);
        ROLE_PRIORITY.put(Roles.PO, 6);
        ROLE_PRIORITY.put(Roles.ADLU, 7);
        ROLE_PRIORITY.put(Roles.RU, 8);
        ROLE_PRIORITY.put(Roles.VU, 9);

        ROLE_ACTIONS.put(Roles.SYSADMIN, Set.of("BLOCK_USER", "UNBLOCK_USER", "FORCE_LOGOUT", "DELETE_USER", "VIEW_ALL"));
        ROLE_ACTIONS.put(Roles.SYSBO, Set.of("BLOCK_USER", "UNBLOCK_USER", "FORCE_LOGOUT", "VIEW_ALL"));
        ROLE_ACTIONS.put(Roles.SMBO, Set.of("BLOCK_USER", "UNBLOCK_USER", "VIEW_ALL"));
        ROLE_ACTIONS.put(Roles.SGVBO, Set.of("BLOCK_USER", "VIEW_ALL"));
        ROLE_ACTIONS.put(Roles.SDVBO, Set.of("BLOCK_USER"));
        ROLE_ACTIONS.put(Roles.PRBO, Set.of("VIEW_PARTNER_DATA"));
        ROLE_ACTIONS.put(Roles.PO, Set.of("VIEW_PO_DATA"));
        ROLE_ACTIONS.put(Roles.ADLU, Set.of("EDIT_SELF", "VIEW_SELF"));
        ROLE_ACTIONS.put(Roles.RU, Set.of("VIEW_SELF"));
        ROLE_ACTIONS.put(Roles.VU, Set.of("VIEW_PUBLIC"));

        VIEW_PERMISSIONS.put(Roles.VU, Set.of(Roles.RU)); 
        VIEW_PERMISSIONS.put(Roles.RU, Set.of(Roles.RU)); 
        VIEW_PERMISSIONS.put(Roles.ADLU, Set.of(Roles.RU, Roles.VU));
        VIEW_PERMISSIONS.put(Roles.PO, Set.of(Roles.RU, Roles.VU));
        VIEW_PERMISSIONS.put(Roles.PRBO, Set.of(Roles.RU, Roles.VU));
        VIEW_PERMISSIONS.put(Roles.SMBO, Roles.ALL_ROLES);
        VIEW_PERMISSIONS.put(Roles.SGVBO, Roles.ALL_ROLES);
        VIEW_PERMISSIONS.put(Roles.SDVBO, Roles.ALL_ROLES);
        VIEW_PERMISSIONS.put(Roles.SYSBO, Roles.ALL_ROLES);
        VIEW_PERMISSIONS.put(Roles.SYSADMIN, Roles.ALL_ROLES);
    }

    public static boolean canPerform(String role, String action) {
        if (role == null || action == null) return false;
        Set<String> actions = ROLE_ACTIONS.get(role.toUpperCase());
        return actions != null && actions.contains(action);
    }

    public static boolean canView(String requesterRole, String targetRole) {
        if (requesterRole == null || targetRole == null) return false;
        Set<String> allowedTargets = VIEW_PERMISSIONS.get(requesterRole.toUpperCase());
        return allowedTargets != null && allowedTargets.contains(targetRole.toUpperCase());
    }

    public static boolean hasHigherPriority(String role1, String role2) {
        return getPriority(role1) < getPriority(role2);
    }

    public static int getPriority(String role) {
        return ROLE_PRIORITY.getOrDefault(role.toUpperCase(), Integer.MAX_VALUE);
    }

    public static Set<String> getActions(String role) {
        return ROLE_ACTIONS.getOrDefault(role.toUpperCase(), Collections.emptySet());
    }

    public static void printPermissions() {
        for (String role : ROLE_ACTIONS.keySet()) {
            System.out.println(role + " => " + ROLE_ACTIONS.get(role));
        }
    }
}
