package pt.unl.fct.di.apdc.userapp.util.execution;

public class EditOperationRequest {
    public String execution_id;
    public OperationEditInfo operation;

    public static class OperationEditInfo {
        public Integer expected_duration_hours;
        public String expected_finish_date;
        // Add other editable fields as needed
    }

    public EditOperationRequest() {}
}
