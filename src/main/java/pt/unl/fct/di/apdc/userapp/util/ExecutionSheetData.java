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
        public String status; // unassigned, assigned, ongoing, completed
        public String starting_date;
        public String finishing_date;
        public String last_activity_date;
        public String observations;
        public List<Track> tracks;
        public String activity_id;
    }

    public static class Track {
        public String type; // always "LineString"
        public List<List<Double>> coordinates;
    }

    public boolean valid() {
        return id != null && worksheet_id != null && starting_date != null
                && polygons_operations != null && !polygons_operations.isEmpty()
                && operations != null && !operations.isEmpty();
    }
}

