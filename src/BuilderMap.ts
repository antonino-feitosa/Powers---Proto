
import { BuilderRoom } from "./BuilderRoom";
import { Grid, Tile } from "./Grid";
import { Point } from "./Point";
import { Random } from "./Random";

export class BuilderMap {
    rand: Random;
    roomBuilder: BuilderRoom;
    constructor(roomBuilder: BuilderRoom, rand: Random) {
        this.rand = rand;
        this.roomBuilder = roomBuilder;
    }
    sample(level: number): Grid {
        let maps: AbstractMap[] = [];
        maps.push(new MapRandomWalk(this.roomBuilder, this.rand));
        let map = this.rand.pick(maps);
        map.build(level);
        return map;
    }
}

abstract class AbstractMap extends Grid {
    rand: Random;
    roomBuilder: BuilderRoom;
    constructor(roomBuilder: BuilderRoom, rand: Random) {
        super();
        this.rand = rand;
        this.roomBuilder = roomBuilder;
    }
    protected abstract sampleParameters(level: number): void;
    protected abstract doBuild(): void;
    build(level: number = 1) {
        this.sampleParameters(level);
        this.doBuild();
    }
    addRoom(center: number) {
        let room = this.roomBuilder.sample(center, this.rand);
        room.applyToMap(this);
        return room;
    }
}

class MapRandomWalk extends AbstractMap {
    length: number;
    iterations: number;
    percentRoom: number;
    protected override sampleParameters(level: number): void {
        this.length = 32;
        this.iterations = 2 * level + 1;
        this.percentRoom = 0.8;
    }
    override doBuild(): void {
        let current = Point.center;
        let points = new Set<number>();
        this.floor.set(current, Tile.Floor);
        for (let i = 0; i < this.iterations; i++) {
            let index = this.rand.nextRange(0, 3);
            points.add(current);
            for (let j = 0; j < this.length; j++) {
                this.floor.set(current, Tile.Floor);
                current = Point.cardinals(current)[index];
            }
        }

        points.forEach(pos => {
            let card = Point.cardinals(pos);
            let count = card.reduce((count, n) => this.floor.has(n) ? count + 1 : count, 0);
            if (count === 1 || this.rand.nextDouble() < this.percentRoom) {
                let room = this.addRoom(pos);
                room.pickStartEndPosition();
                !this.start && (this.start = room.start);
                this.end = room.end;
            }
        });

        this.addWalls();
    }
}


/*
    static fromMapRandomEmptyRoom(pos, rand, maxRooms = 30, minSize = 6, maxSize = 12) {
        let grid = new Grid();
 
        let applyToRoom = (rect) => grid.iterate(rect, (pos) => grid.floor[pos] = Tile.Floor);
        let apply_horizontal_tunnel = (x, ex, y) =>
            grid.iterateHor(x, y, ex - x, (pos) => grid.floor[pos] = Tile.Floor);
        let apply_vertical_tunnel = (y, ey, x) =>
            grid.iterateVer(x, y, ey - y, (pos) => grid.floor[pos] = Tile.Floor);
 
        let connectRoom = (rect) => {
            let source = rect.center();
            let dest = grid.rooms[grid.rooms.length - 1].center();
            if (rand.nextBoolean()) {
                let [sx, ex] = source[0] > dest[0] ? [dest[0], source[0]] : [source[0], dest[0]];
                source[0] !== dest[0] && apply_horizontal_tunnel(sx, ex + 1, dest[1]);
                let [sy, ey] = source[1] > dest[1] ? [dest[1], source[1]] : [source[1], dest[1]];
                source[1] !== dest[1] && apply_vertical_tunnel(sy, ey, source[0]);
            } else {
                let [sy, ey] = source[1] > dest[1] ? [dest[1], source[1]] : [source[1], dest[1]];
                source[1] !== dest[1] && apply_vertical_tunnel(sy, ey, dest[0]);
                let [sx, ex] = source[0] > dest[0] ? [dest[0], source[0]] : [source[0], dest[0]];
                source[0] !== dest[0] && apply_horizontal_tunnel(sx, ex + 1, source[1]);
            }
        }
 
        range(0, maxRooms, _ => {
            let w = rand.nextRange(minSize, maxSize);
            let h = rand.nextRange(minSize, maxSize);
            if (width - w - 1 > minSize && height - h - 1 > minSize) {
                let x = rand.nextRange(1, width - w - 1);
                let y = rand.nextRange(1, height - h - 1);
                let rect = new Rect(x, y, w, h);
                let overlap = false;
                grid.rooms.forEach(r => overlap = overlap || r.overlaps(rect));
                if (!overlap) {
                    applyToRoom(rect);
                    grid.rooms.length > 0 && connectRoom(rect);
                    grid.rooms.push(rect);
                }
            }
        });
 
        return grid;
    }*/
