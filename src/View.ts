
import { Point } from './Point';

const Diagonals = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

export class Viewer {

    isDirty: boolean;
    radius: number;
    center: number;
    opaque: (a: number) => boolean;
    lightMap: Map<number, number>;
    radiusFunction: (x: number, y: number) => number;

    constructor(radius: number, center: number, opaque = () => false, type = 'circle') {
        this.isDirty = true;
        this.radius = radius;
        this.center = center;
        this.opaque = opaque;
        this.lightMap = new Map();
        switch (type) {
            case 'circle': this.radiusFunction = function (x: number, y: number): number { return Math.sqrt(x ** 2 + y ** 2); }; break;
            case 'square': this.radiusFunction = function (x: number, y: number): number { return Math.max(Math.abs(x), Math.abs(y)); }; break;
            case 'diamond': this.radiusFunction = function (x: number, y: number): number { return Math.abs(x) + Math.abs(y); }; break;
        }
    }

    calculate(call: (pos: number, light: number) => void): void {
        if (this.isDirty) {
            this.lightMap = new Map();
            this.lightMap.set(this.center, 1);//light the starting cell
            Diagonals.forEach(([x, y]) => {
                this._castLight(1, 1, 0, 0, x, y, 0);
                this._castLight(1, 1, 0, x, 0, 0, y);
            });
        }

        this.lightMap.forEach((light, pos) => call(pos, light));
    }

    // TODO merge other light fonts
    _castLight(row: number, st: number, end: number, xx: number, xy: number, yx: number, yy: number): void {
        let newStart = 0;
        if (st < end) { return; }

        let [x, y] = Point.to2D(this.center);
        let blocked = false;
        let width = x + this.radius;
        let height = y + this.radius;
        for (let distance = row; distance <= this.radius && !blocked; distance++) {
            let deltaY = -distance;
            for (let deltaX = -distance; deltaX <= 0; deltaX++) {
                let currentX = x + deltaX * xx + deltaY * xy;
                let currentY = y + deltaX * yx + deltaY * yy;
                let leftSlope = (deltaX - 0.5) / (deltaY + 0.5);
                let rightSlope = (deltaX + 0.5) / (deltaY - 0.5);

                if (!(currentX >= 0 && currentY >= 0 && currentX < width && currentY < height) || st < rightSlope) {
                    continue;
                } else if (end > leftSlope) {
                    break;
                }

                //check if it's within the lightable area and light if needed
                if (this.radiusFunction(deltaX, deltaY) <= this.radius) {
                    let bright = (1 - (this.radiusFunction(deltaX, deltaY) / this.radius));
                    bright > 0 && this.lightMap.set(Point.from(currentX, currentY), bright);
                }

                if (blocked) { //previous cell was a blocking one
                    if (this.opaque(Point.from(currentX, currentY))) {//hit a wall
                        newStart = rightSlope;
                        continue;
                    } else {
                        blocked = false;
                        st = newStart;
                    }
                } else {
                    if (this.opaque(Point.from(currentX, currentY)) && distance < this.radius) {//hit a wall within sight line
                        blocked = true;
                        this._castLight(distance + 1, st, leftSlope, xx, xy, yx, yy);
                        newStart = rightSlope;
                    }
                }
            }
        }
    }
}
