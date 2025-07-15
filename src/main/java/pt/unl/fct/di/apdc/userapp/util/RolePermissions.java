package pt.unl.fct.di.apdc.userapp.util;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class RolePermissions {

    private static final Map<String, Integer> ROLE_PRIORITY = new HashMap<>();
    private static final Map<String, Set<String>> ROLE_ACTIONS = new HashMap<>();

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

        ROLE_ACTIONS.put(Roles.SYSADMIN, Set.of("BLOCK_USER", "UNBLOCK_USER", "FORCE_LOGOUT", "DELETE_USER", "VIEW_ALL", "CHANGE_ROLE","CHANGE_STATE","MODIFY_ATTRIBUTES","CHANGE_PASSWORD","REMOVE_ACCOUNT","MODIFY_VISIBILITY","BLOCK_ACCOUNT"));
        ROLE_ACTIONS.put(Roles.SYSBO, Set.of("BLOCK_USER", "UNBLOCK_USER", "FORCE_LOGOUT", "VIEW_ALL", "CHANGE_ROLE","CHANGE_STATE","DELETE_USER","MODIFY_ATTRIBUTES","CHANGE_PASSWORD","BLOCK_ACCOUNT"));
        ROLE_ACTIONS.put(Roles.SMBO, Set.of("BLOCK_USER", "UNBLOCK_USER", "VIEW_ALL","CHANGE_STATE","MODIFY_ATTRIBUTES","CHANGE_PASSWORD"));
        ROLE_ACTIONS.put(Roles.SGVBO, Set.of("BLOCK_USER", "VIEW_ALL", "CHANGE_ROLE","CHANGE_STATE","DELETE_USER","MODIFY_ATTRIBUTES","CHANGE_PASSWORD","REQUEST_SELF_DELETE","REMOVE_ACCOUNT","MODIFY_VISIBILITY","BLOCK_ACCOUNT"));
        ROLE_ACTIONS.put(Roles.SDVBO, Set.of("BLOCK_USER","CHANGE_STATE", "VIEW_ALL","MODIFY_ATTRIBUTES","CHANGE_PASSWORD","BLOCK_ACCOUNT"));
        ROLE_ACTIONS.put(Roles.PRBO, Set.of("VIEW_PARTNER_DATA","CHANGE_PASSWORD","REQUEST_SELF_DELETE"));
        ROLE_ACTIONS.put(Roles.PO, Set.of("VIEW_PO_DATA","CHANGE_PASSWORD","REQUEST_SELF_DELETE"));
        ROLE_ACTIONS.put(Roles.ADLU, Set.of("EDIT_SELF", "VIEW_SELF","MODIFY_ATTRIBUTES","CHANGE_PASSWORD","REQUEST_SELF_DELETE"));
        ROLE_ACTIONS.put(Roles.RU, Set.of("VIEW_SELF","CHANGE_PASSWORD","REQUEST_SELF_DELETE"));
        ROLE_ACTIONS.put(Roles.VU, Set.of("VIEW_PUBLIC","CHANGE_PASSWORD","REQUEST_SELF_DELETE"));
    }

    public static boolean canPerform(String role, String action) {
        if (role == null || action == null) return false;
        Set<String> actions = ROLE_ACTIONS.get(role.toUpperCase());
        return actions != null && actions.contains(action.toUpperCase());
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

    public static boolean canView(String viewerRole, String targetRole) {
        if (viewerRole == null || targetRole == null) return false;

        viewerRole = viewerRole.toUpperCase();
        targetRole = targetRole.toUpperCase();

        if (!Roles.isValidRole(viewerRole) || !Roles.isValidRole(targetRole)) return false;

        if (canPerform(viewerRole, "VIEW_ALL")) return true;

        if (canPerform(viewerRole, "VIEW_PARTNER_DATA") || canPerform(viewerRole, "VIEW_PO_DATA")) {
            return Roles.is(targetRole, Roles.RU, Roles.VU);
        }

        if (Roles.is(viewerRole, Roles.VU, Roles.RU)) {
            return Roles.is(targetRole, Roles.RU);
        }

        if (Roles.is(viewerRole, Roles.ADLU)) {
            return Roles.is(targetRole, Roles.RU, Roles.VU);
        }

        return false;
    }
}