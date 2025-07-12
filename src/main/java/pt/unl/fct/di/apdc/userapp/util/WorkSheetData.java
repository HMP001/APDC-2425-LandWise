package pt.unl.fct.di.apdc.userapp.util;

import java.util.List;
import java.util.Map;
public class WorkSheetData {
    public String title;
    public String id;
    public String issue_date;
    public String award_date;
    public String starting_date;
    public String finishing_date;
    public String service_provider_id;
    public String issuing_user_id;
    public List<String> aigp;

    public String posa_code;
    public String posa_description;
    public String posp_code;
    public String posp_description;

    public String status; 

    public List<Operation> operations;
    public List<Feature> features;

    public static class Operation {
        public String operation_code;
        public String operation_description;
        public double area_ha;
    }

    public static class Feature {
        public String type;
        public Map<String, Object> properties;
        public Geometry geometry;
    }

    public static class Geometry {
        public String type;
        public List<List<List<Double>>> coordinates;
    }

    public static class CRS {
        public String type;
        public Map<String, String> properties;
    }

    public CRS crs;
    public TokenAuth token;

    public boolean valid() {
        return id != null && issue_date != null &&
               starting_date != null && finishing_date != null &&
               award_date != null && service_provider_id != null &&
               posa_code != null && posp_code != null &&
               features != null && !features.isEmpty() &&
               operations != null && !operations.isEmpty();
    }
}
