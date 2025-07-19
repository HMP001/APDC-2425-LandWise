package pt.unl.fct.di.apdc.userapp.util.execution;

public class EditOperationRequest {
    public String execution_id;
    public OperationPatch operation;

    public static class OperationPatch {
        public String operation_code;
        public String expected_duration_hours;
        public String expected_finish_date;
        public String observations;
    }
}

