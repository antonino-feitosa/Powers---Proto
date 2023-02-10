
import { Point } from "./Point";
import { Grid, Tile } from "./Grid";
import { Random } from "./Random";

abstract class AbstractRoom extends Grid {
    rand: Random;
    constructor(rand: Random) {
        super();
        this.rand = rand;
    }
    protected abstract sampleParameters(): void;
    protected abstract doBuild(center: number): void;
    build(center: number) {
        this.sampleParameters();
        this.doBuild(center);
    }
    pickStartEndPosition() {
        const positions = Array.from(this.floor.keys());
        [this.start, this.end] = this.rand.sample(positions, 2);
    }
}

class RoomEmpty extends AbstractRoom {
    minWidth = 5;
    maxWidth = 30;
    minHeight = 5;
    maxHeight = 30;
    width: number;
    height: number;

    override sampleParameters(): void {
        this.width = this.rand.nextRange(this.minWidth, this.maxWidth);
        this.height = this.rand.nextRange(this.minHeight, this.maxHeight);
    }

    override doBuild(center: number): void {
        let halfWidth = this.width >> 1;
        let halfHeight = this.height >> 1;
        for (let y = -halfHeight; y <= halfHeight; y++) {
            for (let x = -halfWidth; x <= halfWidth; x++) {
                let p = x < 0 ? Point.left(center, -x) : Point.right(center, x);
                p = y < 0 ? Point.up(p, -y) : Point.down(p, y);
                this.floor.set(p, Tile.Floor);
            }
        }
        this.rooms.push(this.floor);
    }
}

class RoomBorder extends RoomEmpty {
    percent: number;
    override sampleParameters(): void {
        super.sampleParameters();
        this.percent = this.rand.nextDouble();
    }
    override doBuild(center: number): void {
        let halfWidth = this.width >> 1;
        let halfHeight = this.height >> 1;
        for (let y = -halfHeight; y <= halfHeight; y++) {
            for (let x = -halfWidth; x <= halfWidth; x++) {
                let intern = x > -halfWidth && y > -halfHeight && x < halfWidth && y < halfHeight;
                if (intern || this.rand.nextDouble() < this.percent) {
                    let p = x < 0 ? Point.left(center, -x) : Point.right(center, x);
                    p = y < 0 ? Point.up(p, -y) : Point.down(p, y);
                    this.floor.set(p, Tile.Floor);
                }
            }
        }
        this.rooms.push(this.floor);
    }
}

class RoomPillar extends RoomEmpty {
    percent: number;
    override sampleParameters(): void {
        super.sampleParameters();
        this.percent = this.rand.nextDouble();
    }
    override doBuild(center: number): void {
        super.doBuild(center);
        let halfWidth = this.width >> 1;
        let halfHeight = this.height >> 1;
        for (let y = -halfHeight + 1; y <= halfHeight; y += 2) {
            for (let x = -halfWidth + 1; x <= halfWidth; x += 3) {
                if (this.rand.nextDouble() < this.percent) {
                    let p = x < 0 ? Point.left(center, -x) : Point.right(center, x);
                    p = y < 0 ? Point.up(p, -y) : Point.down(p, y);
                    let neighbor = Point.neighborhood(p);
                    let index = this.rand.pick(neighbor);
                    this.floor.delete(index);
                }
            }
        }
    }
}

abstract class AbstractRoomRandomWalk extends AbstractRoom {
    minLength: 5;
    maxLength: 30;
    minIterations = 5;
    maxIterations = 100;
    iterations: number;
    length: number;
    restart: boolean;
    override sampleParameters(): void {
        this.iterations = this.rand.nextRange(this.minIterations, this.maxIterations);
        this.length = this.rand.nextRange(this.minLength, this.maxLength);
        this.restart = this.rand.nextBoolean();
    }
    override doBuild(center: number): void {
        let current = center;
        for (let i = 0; i < this.iterations; i++) {
            this.restart && (current = center);
            for (let j = 0; j < length; j++) {
                this.floor.set(current, Tile.Floor);
                let card = Point.cardinals(current);
                current = this.rand.pick(card);
            }
        }
        this.rooms.push(this.floor);
    }
}

class RoomCave extends AbstractRoomRandomWalk {
    override sampleParameters(): void {
        super.sampleParameters();
        this.restart = false;
    }
}

class RoomIsland extends AbstractRoomRandomWalk {
    override sampleParameters(): void {
        super.sampleParameters();
        this.restart = true;
    }
}

export class BuilderRoom {
    sample(center: number, rand: Random): Grid {
        let rooms: AbstractRoom[] = [];
        rooms.push(new RoomEmpty(rand));
        rooms.push(new RoomBorder(rand));
        rooms.push(new RoomPillar(rand));
        rooms.push(new RoomCave(rand));
        rooms.push(new RoomIsland(rand));
        let room = rand.pick(rooms);
        room.build(center);
        return room;
    }
}

export class MapBuilder {

    percentMonster = 0.0;
    percentItem = 0.0;
    percentRoom = 0.8;

    minLength = 3;
    maxLength = 30;
    minIterations = 3;
    maxIterations = 100;

    rand: Random;
    roomBuilder = new RoomBuilder();

    constructor(rand: Random) {
        this.rand = rand;
    }

    private addRoom(map: Grid, center: number): void {
        let room = this.roomBuilder.sample(center, this.rand);
        room.floor.forEach((value, key) => map.floor.set(key, value));
        map.rooms.push(room.floor);
    }

    fromRandomWalk(length: number = 30, iterations: number = 5): Grid {
        let points = [];
        let map = new Grid();
        let current = Point.center;

        map.floor.set(current, Tile.Floor);
        for (let i = 0; i < iterations; i++) {
            let index = this.rand.nextRange(0, 3);
            for (let j = 0; j < length; j++) {
                points.push(current);
                map.floor.set(current, Tile.Floor);
                current = Point.cardinals(current)[index];
            }
        }

        this.addRoom(map, points[0]);
        this.addRoom(map, points[points.length - 1]);
        points.slice(1, points.length - 1).forEach(pos => {
            let card = Point.cardinals(pos);
            let count = card.reduce((count, n) => map.floor.has(n) ? count + 1 : count, 0);
            if (count === 1) {
                //this.addRoom(map, pos);
            } else if (this.rand.nextDouble() < this.percentRoom) {
                //this.addRoom(map, pos);
            }
        });

        map.start = this.rand.pick(Array.from(map.rooms[0].keys()));
        map.end = this.rand.pick(Array.from(map.rooms[map.rooms.length - 1].keys()));
        map.addWalls();
        return map;
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
}
