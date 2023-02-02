
import { minimumIndex } from './Utils';
import { Random } from './Random';

export class DijkstraMap {

    static INF = 100;
    sources: Map<number, number>;
    rand: Random;
    neighborhood: (pos: number) => number[];
    cost: (a: number, b: number) => number;
    dist: Map<number, number>;
    max: number;

    fleeMap: DijkstraMap;
    rangeMap: DijkstraMap;

    constructor(sources: Map<number, number>, rand: Random, neighborhood: (pos: number) => number[], cost: (a: number, b: number) => number) {
        this.sources = sources;
        this.rand = rand;
        this.cost = cost;
        this.dist = new Map<number, number>();
        this.neighborhood = neighborhood;
    }

    calculate(cells: Map<number, number>): void {
        this.dist = new Map<number, number>();
        cells.forEach(c => this.dist.set(c, DijkstraMap.INF));
        this.sources.forEach((v, k) => this.dist.set(k, v));
        this.apply_dijkstra();
    }

    private cmp(u: number, v: number): number {
        let a = this.dist.get(u);
        let b = this.dist.get(v);
        if (!a || !b) {
            return DijkstraMap.INF;
            //throw new Error('Point not present at positions!');
        }
        return a - b;
    };

    private apply_dijkstra(): void {
        this.max = 0;

        let queue: number[] = [];
        this.dist.forEach((_, v) => queue.push(v));
        while (queue.length > 0) {
            let min = minimumIndex(queue, this.cmp.bind(this));
            let u = queue[min];
            queue[min] = queue[queue.length - 1];
            queue.length--;

            this.neighborhood(u).forEach(v => {
                let udist = this.dist.get(u) || DijkstraMap.INF;
                let vdist = this.dist.get(v) || DijkstraMap.INF;
                //if (!udist || !vdist) {
                    //throw new Error('Point not present at positions!');
                //}
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
        let index = minimumIndex(neighbor, this.cmp.bind(this));
        return neighbor[index];
    }

    //TODO
    makeRangeMap(force = -1.2, range = 6) {
        let map = new DijkstraMap(this.sources, this.rand, this.neighborhood, this.cost);
        this.dist.forEach((val, key) => {
            if (val < DijkstraMap.INF && val >= range) {
                map.dist.set(key, force * val + (0.01 * this.rand.nextDouble()));
            } else {
                map.dist.set(key, DijkstraMap.INF);
            }
        });
        map.apply_dijkstra();
        this.rangeMap = map;
        return map;
    }

    makeFleeMap(force = -1.2) {
        let map = new DijkstraMap(this.sources, this.rand, this.neighborhood, this.cost);
        this.dist.forEach((val, key) => {
            if (val < DijkstraMap.INF && val >= this.max) {
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
