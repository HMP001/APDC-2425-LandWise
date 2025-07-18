package pt.unl.fct.di.apdc.userapp.util.execution;

import java.util.List;

public class AddInfoToActivityRequest {
    public String execution_id;
    public String activity_id;
    public String observations;
    public List<String> photo_urls;
    public List<Object> tracks;

    public AddInfoToActivityRequest() {}
}
