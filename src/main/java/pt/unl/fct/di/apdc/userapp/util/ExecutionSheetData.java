package pt.unl.fct.di.apdc.userapp.util;

import java.util.List;

public class ExecutionSheetData {

    public Long id;
    public String worksheet_id;
    public String starting_date;
    public String finishing_date;
    public String last_activity_date;
    public String observations;
    public List<Operation> operations;
    public List<PolygonOperations> polygons_operations;

    public static class Operation {
        public String operation_code;
        public double area_ha_executed;
        public double area_perc;
        public String starting_date;
        public String finishing_date;
        public String observations;
    }

    public static class PolygonOperations {
        public int polygon_id;
        public List<PolygonOperation> operations;
    }

    public static class PolygonOperation {
        public String operation_code;      
        public int operation_id;           
        public String operator_username;
        public String status; //assigned unassigned ongoing completed
        public String starting_date;
        public String finishing_date;
        public String last_activity_date;
        public String observations;
        public List<Track> tracks; // usado apenas como input para criar nova activity
        public List<String> photo_urls; // usado apenas como input para criar nova activity
        public String activity_id;
        public List<Activity> activities;
    }

    public static class Activity {
        public String activity_id;
        public String operator_username;
        public String start_time;
        public String end_time;
        public String observations;
        public Track gps_track; 
        public List<String> photo_urls; 
    }
    
    public static class Track {
        public String type; // always "LineString"
        public List<List<Double>> coordinates;
    }

    public boolean valid() {
        return id != null &&
               starting_date != null &&
               operations != null && !operations.isEmpty() &&
               polygons_operations != null && !polygons_operations.isEmpty();
    }
}
