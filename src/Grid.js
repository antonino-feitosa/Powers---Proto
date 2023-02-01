
"use strict";

const { range } = require('./Utils');

class Point {

    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    from(x, y) { return y * this.width + x; }
    to2D(p) { return [p % this.width, Math.floor(p / this.width)]; }

    is2DValid(x, y) {
        return x < this.width && y < this.height && x >= 0 && y >= 0;
    }

    neighborhood(p) {
        let [x, y] = this.to2D(p);
        let inc = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        inc = inc.map(([dx, dy]) => [x + dx, y + dy]).filter(([x, y]) => this.is2DValid(x, y)).map(([x, y]) => this.from(x, y));
        return inc;
    }

    toString(p) { return this.to2D(p).toString() }
}

class Rect {

    constructor(x, y, width, height) {
        this.x1 = x;
        this.x2 = x + width;
        this.y1 = y;
        this.y2 = y + height;
    }
    overlaps(other) { return !(this.x1 > other.x2 || this.x2 < other.x1 || this.y1 > other.y2 || this.y2 < other.y1); }
    center() { return [Math.floor((this.x1 + this.x2) / 2), Math.floor((this.y1 + this.y2) / 2)]; }
    includes(x, y) { return x >= this.x1 && x < this.x2 && y >= this.y1 && y < this.y2; }
    randPos(rand) { return [rand.nextRange(this.x1, this.x2), rand.nextRange(this.y1, this.y2)]; };
}

const Tile = { Floor: '.', Wall: '#', Tunnel: 'C' };

class Grid {

    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.rooms = [];
        this.tiles = [];
        this.revealed = [];
        this.visible = [];
        this.blocked = [];
        this.Point = new Point(width, height);
    }

    bounds() { return new Rect(0, 0, this.width, this.height); }

    area(x, y, call, radius = 10) {
        let rect = new Rect(
            Math.max(0, x - radius),
            Math.max(0, y - radius),
            Math.min(this.width, 2 * radius),
            Math.min(this.height, 2 * radius)
        );
        this.iterate(rect, call);
    }

    iterateDim(x, y, length, isX, call) {
        range(isX ? x : y, length, i => {
            let point = isX ? this.Point.from(i, y) : this.Point.from(x, i);
            call(point, this.tiles[point]);
        });
    }

    iterateVer(x, y, length, call) { this.iterateDim(x, y, length, false, call) }
    iterateHor(x, y, length, call) { this.iterateDim(x, y, length, true, call) }
    iterate(rect, call) {
        range(rect.y1, rect.y2 - rect.y1, row =>
            this.iterateHor(rect.x1, row, rect.x2 - rect.x1, call));
    }

    static fromEmpty = function (width, height, fillBorder = true) {
        let grid = new Grid(width, height);
        grid.rooms.push(new Rect(1, 1, width - 2, height - 2));
        range(0, width * height, index => {
            switch (true) {
                case index < width:
                case index >= width * (height - 1):
                case (index + 1) % width === 0:
                case index % width === 0:
                    grid.tiles.push(fillBorder ? Tile.Wall : Tile.Floor);
                    break;
                default:
                    grid.tiles.push(Tile.Floor);
            }
        });
        return grid;
    }

    static fromBernoulli = function (width, height, rand, prob = 0.2) {
        let grid = new Grid(width, height);
        range(0, width * height, index => {
            switch (true) {
                case index < width:
                case index >= width * (height - 1):
                case (index + 1) % width === 0:
                case index % width === 0:
                case rand.nextDouble() < prob:
                    grid.tiles.push(Tile.Wall);
                    break;
                case rand.nextDouble() < 0.1:
                    let [x, y] = grid.Point.to2D(index);
                    grid.rooms.push(new Rect(x, y, 1, 1));
                // no break
                default:
                    grid.tiles.push(Tile.Floor);
            }
        });
        return grid;
    }

    static fromRandom = function (width, height, rand, maxRooms = 30, minSize = 6, maxSize = 12) {
        let grid = new Grid(width, height);
        range(0, width * height, _ => grid.tiles.push(Tile.Wall));

        let applyToRoom = (rect) => grid.iterate(rect, (pos) => grid.tiles[pos] = Tile.Floor);
        let apply_horizontal_tunnel = (x, ex, y) =>
            grid.iterateHor(x, y, ex - x, (pos) => grid.tiles[pos] = Tile.Floor);
        let apply_vertical_tunnel = (y, ey, x) =>
            grid.iterateVer(x, y, ey - y, (pos) => grid.tiles[pos] = Tile.Floor);

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
    }

}

module.exports = {
    Tile,
    Grid,
    Rect,
    Point
}
