package pt.unl.fct.di.apdc.userapp.util;

import java.util.List;
import java.util.Map;

import pt.unl.fct.di.apdc.userapp.util.WorkSheetData.Feature;
import pt.unl.fct.di.apdc.userapp.util.WorkSheetData.Geometry;
import pt.unl.fct.di.apdc.userapp.util.WorkSheetData.Operation;

public class EditWorkSheetRequest {
    public String id;
    public Map<String, String> attributesEdited;
    
    public List<Operation> operationsEdited;
    public List<Feature> featuresEdited;

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
    
    public EditWorkSheetRequest() {
    }
}