import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

public class View {

    public boolean isDirty;

    public int radius;

    public Function<Point,Boolean> opaqueFunction;

    public Map<Point, Double> lightMap;

    public Function<Point,Double> radiusFunction;

    private Point center;

    public final Function<Point,Double> CIRCLE = (p) -> Math.sqrt(p.x * p.x + p.y * p.y);
    public final Function<Point,Double> SQUARE = (p) -> (double) Math.max(Math.abs(p.x), Math.abs(p.y));
    public final Function<Point,Double> DIAMOND = (p) -> (double) Math.abs(p.x) + Math.abs(p.y);

    public View(int radius, Function<Point,Boolean> opaque) {
        this.isDirty = true;
        this.radius = radius;
        this.opaqueFunction = opaque;
        this.radiusFunction = DIAMOND;
    }

    public void calculate(Point center) {
        if (this.isDirty || !this.center.equals(center)) {
            this.center = center;
            this.lightMap = new HashMap<Point, Double>();
            this.lightMap.put(this.center, 1d);// light the starting cell
            new Point(0, 0).diagonals().stream().forEach((p) -> {
                this.castLight(1, 1, 0, 0, p.x, p.y, 0);
                this.castLight(1, 1, 0, p.x, 0, 0, p.y);
            });
        }
    }

    // TODO merge other light fonts
    private void castLight(int row, int st, int end, int xx, int xy, int yx, int yy) {
        int newStart = 0;
        if (st < end) {
            return;
        }

        boolean blocked = false;
        int width = center.x + radius;
        int height = center.y + radius;
        for (int distance = row; distance <= radius && !blocked; distance++) {
            int deltaY = -distance;
            for (int deltaX = -distance; deltaX <= 0; deltaX++) {
                int currentX = center.x + deltaX * xx + deltaY * xy;
                int currentY = center.y + deltaX * yx + deltaY * yy;
                int leftSlope = (int) ((deltaX - 0.5) / (deltaY + 0.5));
                int rightSlope = (int) ((deltaX + 0.5) / (deltaY - 0.5));

                if (!(currentX >= 0 && currentY >= 0 && currentX < width && currentY < height) || st < rightSlope) {
                    continue;
                } else if (end > leftSlope) {
                    break;
                }

                // check if it's within the lightable area and light if needed
                double dist = radiusFunction.apply(new Point(deltaX, deltaY));
                Point current = new Point(currentX, currentY);
                if (dist <= radius) {
                    double bright = (1 - (dist / radius));
                    if (bright > 0) {
                        lightMap.put(current, bright);
                    }
                }

                if (blocked) { // previous cell was a blocking one
                    if (opaqueFunction.apply(current)) {// hit a wall
                        newStart = rightSlope;
                        continue;
                    } else {
                        blocked = false;
                        st = newStart;
                    }
                } else {
                    if (opaqueFunction.apply(current) && distance < this.radius) {// hit a wall within sight line
                        blocked = true;
                        castLight(distance + 1, st, leftSlope, xx, xy, yx, yy);
                        newStart = rightSlope;
                    }
                }
            }
        }
    }
}
