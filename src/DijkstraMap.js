
"use strict";

const { minimumIndex } = require('./Utils');

class DijkstraMap {

    static INF = 100;

    constructor(sources = new Map(), rand, neighborhood, cost, dist) {
        this.sources = sources || new Map();
        this.rand = rand;
        this.dist = dist || new Map();
        this.cost = cost || this.cost;
        this.neighborhood = neighborhood || this.neighborhood;
    }

    cost(u, v) { return 1; }
    neighborhood(p) { return []; }

    calculate(cells) {
        this.dist = new Map();
        cells.forEach(c => this.dist.set(c, DijkstraMap.INF));
        this.sources.forEach((v, k) => this.dist.set(k, v));
        this.apply_dijkstra();
    }

    apply_dijkstra() {
        this.max = 0;
        let cmp = (u, v) => this.dist.get(u) - this.dist.get(v);

        let queue = [];
        this.dist.forEach((_, v) => queue.push(v));
        while (queue.length > 0) {
            let min = minimumIndex(queue, cmp);
            let u = queue[min];
            queue[min] = queue[queue.length - 1];
            queue.length--;

            this.neighborhood(u).forEach(v => {
                let alt = this.dist.get(u) + this.cost(u, v);
                if (alt < this.dist.get(v)) {
                    this.dist.set(v, alt);
                    if (alt < DijkstraMap.INF && alt > this.max) {
                        this.max = alt;
                    }
                }
            });
        }
    }

    chase(point) {
        let cmp = (u, v) => this.dist.get(u) - this.dist.get(v);
        let neighbor = this.neighborhood(point);
        let index = minimumIndex(neighbor, cmp);
        return neighbor[index];
    }

    makeRangeMap(force = -1.2, range = 6) {
        let map = new DijkstraMap(this.sources, this.rand, this.neighborhood, this.cost);
        this.dist.forEach((val, key) => {
            if(val < DijkstraMap.INF && val >= range){
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
            if(val < DijkstraMap.INF && val >= this.max){
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

module.exports = {
    DijkstraMap
}
