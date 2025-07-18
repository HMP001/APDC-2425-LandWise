package pt.unl.fct.di.apdc.userapp.util.execution;

import java.util.List;

public class AssignOperationRequest {
    public String execution_id;
    public List<PolygonOperationAssignment> polygon_operations;

    public static class PolygonOperationAssignment {
        public int polygon_id;
        public List<OperationAssignment> operations;
    }

    public static class OperationAssignment {
        public String operation_code;
        public String operator_username;
    }
}
