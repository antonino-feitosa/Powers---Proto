
import { Random } from './Random';
import { Point } from './Point';

export class DijkstraMap {

    static INF = 100;
    attractionPoints: Map<number, number>;
    repulsionPoints: Map<number, { radius: number, force: number }>;
    rand: Random;
    _neighborhood: (pos: number) => number[];
    _moveCost: (a: number, b: number) => number;
    dist: Map<number, number>;
    max: number;

    fleeMap: DijkstraMap;
    rangeMap: DijkstraMap;

    constructor(rand: Random, neighborhood: (pos: number) => number[], moveCost: (a: number, b: number) => number) {
        this.rand = rand;
        this._moveCost = moveCost;
        this._neighborhood = neighborhood;
        this.dist = new Map<number, number>();
        this.attractionPoints = new Map<number, number>();
        this.repulsionPoints = new Map<number, { radius: number, force: number }>();
    }

    clear() {
        this.dist = new Map<number, number>();
        this.attractionPoints = new Map<number, number>();
        this.repulsionPoints = new Map<number, { radius: number, force: number }>();
    }

    addAttractionPoint(pos: number, force: number = 0): void {
        this.attractionPoints.set(pos, force);
    }

    addRepulsionPoint(pos: number, radius: number = 3, force: number = 1.2) {
        this.repulsionPoints.set(pos, { radius: radius, force: force });
    }

    private neighborhood(pos:number){
        return this._neighborhood(pos).filter(pos => this.dist.has(pos));
    }

    private cost(source: number, dest: number): number {
        let cost = this._moveCost(source, dest);

        this.repulsionPoints.forEach(({ radius, force }, center) => {
            let costSource = this._moveCost(source, center);
            let costDest = this._moveCost(dest, center);
            let sourceRadius = Point.distance(source, center) <= radius;
            let destRadius = Point.distance(dest, center) <= radius;
            if (sourceRadius && destRadius && costDest < costSource) {
                cost = cost * force + (costSource - costDest);
            }
        });
        return cost;
    }

    private cmp(u: number, v: number): number {
        let a = this.dist.get(u) as number;
        let b = this.dist.get(v) as number;
        return a - b;
    };

    private getMinimumElement(queue: number[]) : number{
        let min = -1;
        queue.forEach((pos, index) => {
            if (min == -1 || this.cmp(pos, queue[min]) < 0) {
                min = index;
            }
        });
        return min;
    }

    calculate(cells: Map<number, number>): void {
        this.dist = new Map<number, number>();
        cells.forEach((_, pos) => this.dist.set(pos, DijkstraMap.INF));
        this.attractionPoints.forEach((force, pos) => this.dist.set(pos, force))
        this.apply_dijkstra();
    }

    private apply_dijkstra(): void {
        this.max = 0;

        let queue: number[] = [];
        this.dist.forEach((_, pos) => queue.push(pos));
        while (queue.length > 0) {
            let min = this.getMinimumElement(queue);
            let u = queue[min];
            queue[min] = queue[queue.length - 1];
            queue.length--;

            this.neighborhood(u).forEach(v => {
                let udist = this.dist.get(u) as number;
                let vdist = this.dist.get(v) as number;
                let alt = udist === DijkstraMap.INF ? DijkstraMap.INF : udist + this.cost(u, v);
                if (alt < vdist) {
                    this.dist.set(v, alt);
                    if (alt < DijkstraMap.INF && alt > this.max) {
                        this.max = alt;
                    }
                }
            });
        }
    }

    chase(point: number): number {
        let neighbor = this.neighborhood(point);
        let min = -1;
        neighbor.forEach((n, index) => {
            if (min == -1 || this.cmp(n, neighbor[min]) < 0) {
                min = index;
            }
        });
        if (min === -1) {
            //console.warn('Chase: There is not a neighborhoods!');
            //throw new Error('Chase: There is not a neighborhoods!');
            return point;
        }
        return neighbor[min];
    }

    makeRangeMap(force = -1.2, range = 3) {
        let map = new DijkstraMap(this.rand, this._neighborhood, this._moveCost);
        this.dist.forEach((val, pos) => {
            if (val < DijkstraMap.INF && val >= range && val < range + 1) {
                map.dist.set(pos, force * val + (0.001 * this.rand.nextDouble()));
            } else {
                map.dist.set(pos, DijkstraMap.INF);
            }
        });
        map.apply_dijkstra();
        this.rangeMap = map;
        return map;
    }

    makeFleeMap(force = -1.2, cut = 0.9) {
        let map = new DijkstraMap(this.rand, this._neighborhood, this._moveCost);
        let threshold = this.max * cut;
        this.dist.forEach((val, key) => {
            if (val < DijkstraMap.INF && val >= threshold) {
                map.dist.set(key, force * val + (0.01 * this.rand.nextDouble()));
            } else {
                map.dist.set(key, DijkstraMap.INF);
            }
        });
        map.apply_dijkstra();
        this.fleeMap = map;
        return map;
    }
}
