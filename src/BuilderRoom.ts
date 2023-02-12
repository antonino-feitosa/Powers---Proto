
import { Point } from "./Point";
import { Grid, Tile } from "./Grid";
import { Random } from "./Random";

export class BuilderRoom {
    sample(center: number, rand: Random): AbstractRoom {
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

abstract class AbstractRoom extends Grid {
    rand: Random;
    constructor(rand: Random) {
        super();
        this.rand = rand;
    }
    protected abstract sampleParameters(): void;
    protected abstract doBuild(center: number): void;
    build(center: number): void {
        this.sampleParameters();
        this.doBuild(center);
    }
    pickStartEndPosition(): void {
        const positions = Array.from(this.floor.keys());
        [this.start, this.end] = this.rand.sample(positions, 2);
    }
    applyToMap(grid: Grid): void {
        this.floor.forEach((value, key) => grid.floor.set(key, value));
        grid.rooms.push(this.floor);
    }
}

class RoomEmpty extends AbstractRoom {
    minWidth = 5;
    maxWidth = 15;
    minHeight = 5;
    maxHeight = 15;
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
    minLength = 5;
    maxLength = 15;
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
            for (let j = 0; j < this.length; j++) {
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
