package pt.unl.fct.di.apdc.userapp.util;
import java.util.List;

public class WorkSheetSearchRequest {
	public String id;
    public String title;
    public String status;
    public List<String> aigp;
    public String serviceProviderId;
    public String issuing_user_id;
    public String starting_date;
    public String finishing_date;
    public String awardDate;
    public String issueDate;
    public Integer limit;
    public Integer offset;

    public WorkSheetSearchRequest() {
    	
    }
}
