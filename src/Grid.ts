
import { Point } from "./Point";
import { Random } from "./Random";
import { Entity } from "./Entity";

export class Rect {
    upLeft: number;
    upRight: number;
    downLeft: number;
    downRight: number;
    width: number;
    height: number;

    constructor(point: number, width: number, height: number) {
        this.upLeft = point;
        this.upRight = Point.right(point, width);
        this.downLeft = Point.down(point, height);
        this.downRight = Point.downRight(point, height);
        this.width = width;
        this.height = height;
    }
    overlaps(other: Rect) { return !(this.upLeft > other.upRight || this.upRight < other.upLeft || this.upLeft > other.downLeft || this.downLeft < other.upLeft); }
    center(): number { let p = Point.right(this.upLeft, this.width >> 1); return Point.down(p, this.height >> 1); }
    randPos(rand: Random): number { let p = Point.right(this.upLeft, rand.nextInt(this.width)); return Point.down(p, rand.nextInt(this.height)); }
}

export const Tile = { Floor: '.', Wall: '#', Tunnel: 'C' };

export class Grid {
    end: number; // position of final stair
    start: number; // position of initial stair
    rooms: Map<number, string>[];
    floor: Map<number, string>;
    walls: Map<number, string>;
    revealed: Map<number, number>;
    visible: Map<number, number>;
    pointToEntity: Map<number, Entity[]>;

    constructor() {
        this.rooms = [];
        this.floor = new Map<number, string>();
        this.walls = new Map<number, string>();
        this.revealed = new Map<number, number>();
        this.visible = new Map<number, number>();
        this.pointToEntity = new Map<number, Entity[]>();
    }

    addWalls(): void {
        const floor = this.floor;
        const walls = this.walls;
        floor.forEach((_, pos) => {
            let neighbor = Point.neighborhood(pos);
            neighbor.forEach(n => !floor.has(n) && (walls.set(n, Tile.Wall)));
        });
        walls.forEach((_, pos) => {
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
        });
    }
}
