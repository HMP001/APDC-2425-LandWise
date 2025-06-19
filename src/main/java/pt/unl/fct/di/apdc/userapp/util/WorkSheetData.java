package pt.unl.fct.di.apdc.userapp.util;

import java.util.List;
import java.util.Map;

public class WorkSheetData {
    public String id;
    public String title;

    public List<Map<String, Double>> polygon; // lista de pontos GPS (lat, lng)
    public AIGP aigp;

    public String status;
    public String starting_date;
    public String finishing_date;
    public String issue_date;
    public String award_date;
    public String service_provider_id;
    public String posa_code;
    public String posa_description;
    public String posp_code;
    public String posp_description;

    public List<Operation> operations;
    public TokenAuth token;

    public static class Operation {
        public String operation_code;
        public String operation_description;
        public double area_ha;
    }

    public static class AIGP {
        public String id;
        public String name;
        public String address;
        public String nif;
    }

    public WorkSheetData() {}

    public boolean valid() {
        return id != null && title != null &&
               polygon != null && !polygon.isEmpty() &&
               aigp != null && aigp.id != null && aigp.nif != null &&
               status != null && starting_date != null &&
               finishing_date != null && issue_date != null &&
               award_date != null && service_provider_id != null &&
               posa_code != null && posa_description != null &&
               posp_code != null && posp_description != null &&
               operations != null && !operations.isEmpty();
    }
}
