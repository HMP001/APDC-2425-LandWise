package pt.unl.fct.di.apdc.userapp.util.execution;

import java.util.List;

public class AssignOperationRequest {
    public String execution_id;
    public List<PolygonOperationAssignment> polygon_operations;
    public String operator_username;

    public static class PolygonOperationAssignment {
        public String polygon_id;
        public String operation_code;
    }
}
