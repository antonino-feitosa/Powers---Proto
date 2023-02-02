
"use strict";

const {Point} = require('./Point');

class Rect {
    constructor(point, width, height) {
        this.upLeft = point;
        this.upRight = Point.right(point, width);
        this.downLeft = Point.down(point, height);
        this.downRight = Point.downRight(point, height);
        this.width = width;
        this.height = height;
    }
    overlaps(other) { return !(this.upLeft > other.upRight || this.upRight < other.upLeft || this.upLeft > other.downLeft || this.downLeft < other.upLeft); }
    center() { let p = Point.right(this.upLeft, this.width >> 1); return Point.down(p, this.height >> 1); }
    randPos(rand) { let p = Point.right(this.upLeft, rand.nextInt(this.width)); return Point.down(p, rand.nextInt(this.height)); }
}

const Tile = { Floor: '.', Wall: '#', Tunnel: 'C' };

class Grid {
    constructor() {
        this.end; // position of final stair
        this.start; // position of initial stair
        this.player; // player initial position
        this.rooms = [];
        this.floor = new Map();
        this.walls = new Map();
        this.revealed = new Map();
        this.visible = new Map();
        this.pointToEntity = new Map();
    }

    addWalls() {
        const floor = this.floor;
        const walls = this.walls;
        const Point = Point;
        for (var pos in floor) {
            let neighbor = Point.neighborhood(pos);
            neighbor.forEach(n => !floor.has(n) && (walls.set(n,n)));
        }
        for (var pos in walls) {
            let mask = 0;
            if (walls.has(Point.up(pos))) { mask += 1; }
            if (walls.has(Point.down(pos))) { mask += 2; }
            if (walls.has(Point.left(pos))) { mask += 4; }
            if (walls.has(Point.right(pos))) { mask += 8; }
            switch (mask) {
                case 0: walls.set(pos, '\u25CB'); break; // Pillar because we can't see neighbors
                case 1: walls.set(pos, '\u2551'); break; // Wall only to the north
                case 2: walls.set(pos, '\u2551'); break; // Wall only to the south
                case 3: walls.set(pos, '\u2551'); break; // Wall to the north and south
                case 4: walls.set(pos, '\u2550'); break; // Wall only to the west
                case 5: walls.set(pos, '\u255D'); break; // Wall to the north and west
                case 6: walls.set(pos, '\u2557'); break; // Wall to the south and west
                case 7: walls.set(pos, '\u2563'); break; // Wall to the north, south and west
                case 8: walls.set(pos, '\u2550'); break; // Wall only to the east
                case 9: walls.set(pos, '\u255A'); break; // Wall to the north and east
                case 10: walls.set(pos, '\u2554'); break; // Wall to the south and east
                case 11: walls.set(pos, '\u2560'); break; // Wall to the north, south and east
                case 12: walls.set(pos, '\u2550'); break; // Wall to the east and west
                case 13: walls.set(pos, '\u2569'); break; // Wall to the east, west, and south
                case 14: walls.set(pos, '\u2566'); break; // Wall to the east, west, and north
                case 15: walls.set(pos, '\u256C'); break;  // ╬ Wall on all sides
            }
        }
    }

    static fromRoomEmpty(pos, width, height) {
        const grid = new Grid();
        grid.player = pos;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let p = Point.right(pos, x);
                p = Point.down(p, y);
                grid.floor.set(p, Tile.Floor);
            }
        }
        grid.rooms.push(grid.floor);
        return grid;
    }

    static fromRoomBernoulli(pos, width, height, rand, prob = 0.8) {
        const grid = new Grid();
        grid.player = pos;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (rand.nextDouble() < prob) {
                    let p = Point.right(pos, x);
                    p = Point.down(p, y);
                    grid.floor.set(p, Tile.Floor);
                }
            }
        }
        grid.rooms.push(grid.floor);
        return grid;
    }

    static fromRoomPillarBernoulli(pos, width, height, rand, prob = 0.2) {
        const grid = Grid.fromRoomEmpty(pos, width, height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (rand.nextDouble() < prob) {
                    let neighbor = Point.neighborhood(pos);
                    let index = rand.pick(neighbor);
                    floor.delete(index);
                }
            }
        }
        return grid;
    }

    static fromRoomRandomWalk(pos, rand, length = 10, iterations = 10, restart = true) {
        const grid = new Grid();
        grid.player = pos;
        let current = pos;
        for (let i = 0; i < iterations; i++) {
            restart && (current = pos);
            grid.floor.set(current, current);
            for (let j = 0; j < length; j++) {
                let card = Point.cardinals(pos);
                current = rand.pick(card);
                grid.floor.set(current, Tile.Floor);
            }
        }
        grid.rooms.push(grid.floor);
        return grid;
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

module.exports = {
    Tile,
    Grid,
    Rect
}
