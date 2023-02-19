import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.PriorityQueue;
import java.util.Queue;
import java.util.Set;
import java.util.stream.Collectors;

interface NeighborhoodFunction {
    public List<Point> neighborhood(Point p);
}

interface MoveCostFunction {
    public double cost(Point source, Point dest);
}

public class DijkstraMap {

    private class Intensity {
        public double radius;
        public double force;

        Intensity(double radius, double force) {
            this.radius = radius;
            this.force = force;
        }
    }

    protected static final double INF = Integer.MAX_VALUE;

    protected Map<Point, Double> attractionPoints;

    protected Map<Point, Intensity> repulsionPoints;

    protected Random rand;

    protected NeighborhoodFunction neighborhoodFunction;

    protected MoveCostFunction moveCostFunction;

    private double max;

    public final Map<Point, Double> follow;

    public DijkstraMap fleeMap;

    public DijkstraMap rangeMap;

    DijkstraMap(Random rand, NeighborhoodFunction neighborhood, MoveCostFunction moveCost) {
        this.rand = rand;
        moveCostFunction = moveCost;
        neighborhoodFunction = neighborhood;
        follow = new HashMap<Point, Double>();
        attractionPoints = new HashMap<Point, Double>();
        repulsionPoints = new HashMap<Point, Intensity>();
    }

    public void clear() {
        follow.clear();
        attractionPoints.clear();
        repulsionPoints.clear();
    }

    public void addAttractionPoint(Point pos, double force) {
        attractionPoints.put(pos, force);
    }

    public void addRepulsionPoint(Point pos, double radius, double force) {
        repulsionPoints.put(pos, new Intensity(radius, force));
    }

    public void addRepulsionPoint(Point pos) {
        addRepulsionPoint(pos, 3, 1.2);
    }

    protected List<Point> neighborhood(Point pos) {
        return neighborhoodFunction.neighborhood(pos).stream().filter((n) -> follow.containsKey(n))
                .collect(Collectors.toList());
    }

    private double cost(Point source, Point dest) {
        double cost = moveCostFunction.cost(source, dest);
        repulsionPoints.forEach((center, intensity) -> {
            double costSource = moveCostFunction.cost(source, center);
            double costDest = moveCostFunction.cost(dest, center);
            boolean sourceRadius = source.distance(center) <= intensity.radius;
            boolean destRadius = dest.distance(center) <= intensity.radius;
            if (sourceRadius && destRadius && costDest < costSource) {
                cost = cost * intensity.force + (costSource - costDest);
            }
        });
        return cost;
    }

    private int cmp(Point u, Point v) {
        double a = follow.get(u);
        double b = follow.get(v);
        return a - b == 0 ? 0 : (a < b ? -1 : 1);
    }

    public void calculate(Set<Point> cells) {
        clear();
        cells.forEach((p) -> follow.put(p, DijkstraMap.INF));
        attractionPoints.forEach((pos, force) -> follow.put(pos, force));
        apply_dijkstra();
    }

    private void apply_dijkstra() {
        max = 0;
        Queue<Point> queue = new PriorityQueue<Point>(this::cmp);
        follow.forEach((pos, value) -> queue.add(pos));
        while (queue.size() > 0) {
            Point u = queue.poll();
            neighborhood(u).forEach(v -> {
                double udist = follow.get(u);
                double vdist = follow.get(v);
                double alt = udist == DijkstraMap.INF ? DijkstraMap.INF : udist + cost(u, v);
                if (alt < vdist) {
                    follow.put(v, alt);
                    if (alt < DijkstraMap.INF && alt > max) {
                        max = alt;
                    }
                }
            });
        }
    }

    public Optional<Point> chase(Point point) {
        List<Point> neighbor = neighborhood(point);
        return neighbor.stream().min(this::cmp);
    }

    public DijkstraMap makeRangeMap(double force, double range) {
        rangeMap = new DijkstraMap(rand, neighborhoodFunction, moveCostFunction);
        follow.forEach((pos, val) -> {
            if (val < DijkstraMap.INF && val >= range && val < range + 1) {
                rangeMap.follow.put(pos, force * val + (0.001 * rand.nextDouble()));
            } else {
                rangeMap.follow.put(pos, DijkstraMap.INF);
            }
        });
        rangeMap.apply_dijkstra();
        return rangeMap;
    }

    public DijkstraMap makeFleeMap(double force, double cut) {
        fleeMap = new DijkstraMap(rand, neighborhoodFunction, moveCostFunction);
        double threshold = this.max * cut;
        follow.forEach((pos, val) -> {
            if (val < DijkstraMap.INF && val >= threshold) {
                fleeMap.follow.put(pos, force * val + (0.01 * this.rand.nextDouble()));
            } else {
                fleeMap.follow.put(pos, DijkstraMap.INF);
            }
        });
        fleeMap.apply_dijkstra();
        return fleeMap;
    }
}
