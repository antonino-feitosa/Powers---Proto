
import { BuilderRoom } from "./BuilderRoom";
import { Grid, Rect, Tile } from "./Grid";
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
        maps.push(new MapBinaryPartition(this.roomBuilder, this.rand));
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
    center: number;
    iterations: number;
    percentRoom: number;
    protected override sampleParameters(level: number): void {
        this.length = 32;
        this.center = Point.center;
        this.iterations = 2 * level + 1;
        this.percentRoom = 0.8;
    }
    protected override doBuild(): void {
        let current = this.center;
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

class MapBinaryPartition extends AbstractMap {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    width: number;
    height: number;
    xoffset: number;
    yoffset: number;
    center: number;
    protected override sampleParameters(level: number): void {
        const rand = this.rand;
        this.minWidth = 10 + level;
        this.maxWidth = 2 * this.minWidth + 1;
        this.minHeight = 10 + level;
        this.maxHeight = 2 * this.minHeight + 1;
        this.width = rand.nextRange(this.minWidth, this.maxWidth);
        this.height = rand.nextRange(this.minHeight, this.maxHeight);
        this.xoffset = rand.nextRange(1, 10);
        this.yoffset = rand.nextRange(1, 10);
        let center = Point.center;
        center = Point.left(center, Math.floor(this.width / 2));
        center = Point.up(center, Math.floor(this.height / 2));
        this.center = center;
    }
    protected override doBuild(): void {
        let queue = new Array<Rect>();
        let area = new Rect(this.center, this.width, this.height);
        queue.push(area);
        let result = new Array<Rect>();
        while (queue.length > 0) {
            let rect = queue.shift() as Rect;
            this.divide(rect, queue, result);
        }
        result.forEach(r => this.addRoom(r.center()));
        this.addCorridors(result);
    }
    private divide(rect: Rect, queue: Array<Rect>, result: Array<Rect>): void {
        if (this.rand.nextBoolean()) {
            let xindex = (rect.upLeft + rect.upRight) >> 1;
            if (xindex - rect.upLeft > this.minWidth) {
                xindex = this.rand.nextRange(rect.upLeft + this.minWidth, rect.upRight - this.minWidth);
                this.divideHorizontal(xindex, rect, queue);
            } else {
                result.push(rect);
            }
        } else {
            let yindex = (rect.upLeft + rect.downLeft) >> 1;
            if (yindex - rect.upLeft > this.minHeight) {
                yindex = this.rand.nextRange(rect.upLeft + this.minHeight, rect.downLeft - this.minHeight);
                this.divideVertical(yindex, rect, queue);
            } else {
                result.push(rect);
            }
        }
    }
    private divideHorizontal(xindex: number, rect: Rect, queue: Array<Rect>): void {
        let leftWidth = xindex - rect.upLeft;
        if (leftWidth > this.minWidth) {
            let left = new Rect(rect.upLeft, leftWidth, rect.height);
            queue.push(left);
        }
        let rightWidth = rect.upRight - xindex;
        if (rightWidth > this.minWidth) {
            let right = new Rect(xindex, rightWidth, rect.height);
            queue.push(right);
        }
    }
    private divideVertical(yindex: number, rect: Rect, queue: Array<Rect>): void {
        let upHeight = yindex - rect.upLeft;
        if (upHeight > this.minHeight) {
            let up = new Rect(rect.upLeft, rect.width, upHeight);
            queue.push(up);
        }
        let downHeight = rect.downLeft - yindex;
        if (downHeight > this.minHeight) {
            let down = new Rect(yindex, rect.width, downHeight);
            queue.push(down);
        }
    }
    private addCorridors(result: Rect[]): void {
        if (result.length < 2) throw new Error('The map must have at least 2 rooms! Current: ' + result.length);
        let start = result.shift() as Rect;
        while (result.length > 0) {
            let next = this.searchClosest(start, result);
            let source = start.center();
            let dest = next.center();
            if (this.rand.nextBoolean()) {
                [source, dest] = this.addCorridorHor(source, dest);
                this.addCorridorVer(source, dest);
            } else {
                [source, dest] = this.addCorridorVer(source, dest);
                this.addCorridorHor(source, dest);
            }
        }
    }
    private searchClosest(rect: Rect, result: Rect[]): Rect {
        let center = rect.center();
        return result.reduce((min, current) => {
            let adist = Point.distance(min.center(), center);
            let bdist = Point.distance(current.center(), center);
            return adist < bdist ? min : current;
        }, result[0]);
    }
    private addCorridorHor(source: number, dest: number): Array<number> {
        [source, dest] = Point.sortX(source, dest);
        while (!Point.sameX(source, dest)) {
            !this.floor.has(source) && this.floor.set(source, Tile.Tunnel);
            source = Point.right(source);
        }
        return [source, dest];
    }
    private addCorridorVer(source: number, dest: number): Array<number> {
        [source, dest] = Point.sortY(source, dest);
        while (!Point.sameY(source, dest)) {
            !this.floor.has(source) && this.floor.set(source, Tile.Tunnel);
            source = Point.down(source);
        }
        return [source, dest];
    }
}
