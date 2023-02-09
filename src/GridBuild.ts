
import { Point } from "./Point";
import { Grid, Tile } from "./Grid";
import { Random } from "./Random";

export class RoomBuilder {

    minWidth = 5;
    maxWidth = 20;
    minHeight = 5;
    maxHeight = 20;

    minLength = 5;
    maxLength = 20;
    minIterations = 5;
    maxIterations = 50;

    sample(center: number, rand: Random): Grid {
        let roomFunction = [];
        let width = rand.nextRange(this.minWidth, this.maxWidth);
        let height = rand.nextRange(this.minHeight, this.maxHeight);
        //let length = rand.nextRange(this.minLength, this.maxLength);
        //let iterations = rand.nextRange(this.minIterations, this.maxIterations);
        //roomFunction.push(RoomBuilder.fromRoomEmpty.bind(RoomBuilder, center, width, height, rand));
        //roomFunction.push(RoomBuilder.fromRoomBorder.bind(RoomBuilder, center, width, height, rand, rand.nextDouble()));
        roomFunction.push(RoomBuilder.fromRoomPillarBernoulli.bind(RoomBuilder, center, width, height, rand, 1/*rand.nextDouble()*/));
        //roomFunction.push(RoomBuilder.fromRoomRandomWalk.bind(RoomBuilder, center, rand, length, iterations, rand.nextBoolean()));
        let room = rand.pick(roomFunction);
        return room();
    }

    static fromRoomEmpty(center: number, width: number, height: number, rand: Random): Grid {
        const grid = new Grid();
        let halfWidth = width >> 1;
        let halfHeight = height >> 1;
        for (let y = -halfHeight; y <= halfHeight; y++) {
            for (let x = -halfWidth; x <= halfWidth; x++) {
                let p = x < 0 ? Point.left(center, -x) : Point.right(center, x);
                p = y < 0 ? Point.up(p, -y) : Point.down(p, y);
                grid.floor.set(p, Tile.Floor);
            }
        }
        grid.rooms.push(grid.floor);
        return grid;
    }

    static fromRoomBorder(center: number, width: number, height: number, rand: Random, prob = 0.8): Grid {
        const grid = new Grid();
        let halfWidth = width >> 1;
        let halfHeight = height >> 1;
        for (let y = -halfHeight; y <= halfHeight; y++) {
            for (let x = -halfWidth; x <= halfWidth; x++) {
                if ((x > -halfWidth && y > -halfHeight && x < halfWidth && y < halfHeight) || rand.nextDouble() < prob) {
                    let p = x < 0 ? Point.left(center, -x) : Point.right(center, x);
                    p = y < 0 ? Point.up(p, -y) : Point.down(p, y);
                    grid.floor.set(p, Tile.Floor);
                }
            }
        }
        grid.rooms.push(grid.floor);
        return grid;
    }

    static fromRoomPillarBernoulli(center: number, width: number, height: number, rand: Random, prob = 0.2): Grid {
        const grid = RoomBuilder.fromRoomEmpty(center, width, height, rand);
        let halfWidth = width >> 1;
        let halfHeight = height >> 1;
        for (let y = -halfHeight + 1; y <= halfHeight; y+=2) {
            for (let x = -halfWidth + 1; x <= halfWidth; x+=3) {
                if (rand.nextDouble() < prob) {
                    let p = x < 0 ? Point.left(center, -x) : Point.right(center, x);
                    p = y < 0 ? Point.up(p, -y) : Point.down(p, y);
                    let neighbor = Point.neighborhood(p);
                    let index = rand.pick(neighbor);
                    grid.floor.delete(index);
                }
            }
        }
        return grid;
    }

    static fromRoomRandomWalk(center: number, rand: Random, length = 10, iterations = 10, restart = true): Grid {
        const grid = new Grid();
        let current = center;
        console.log(length, iterations);
        for (let i = 0; i < iterations; i++) {
            restart && (current = center);
            for (let j = 0; j < length; j++) {
                grid.floor.set(current, Tile.Floor);
                let card = Point.cardinals(current);
                current = rand.pick(card);
            }
        }
        grid.rooms.push(grid.floor);
        return grid;
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
