
export class Point {
    static width = 10000;
    static xcenter = 5000;
    static ycenter = 5000;

    static center = Point.width * Point.ycenter + Point.xcenter;

    static from(x: number, y: number): number { return y * Point.width + x; }
    static to2D(p: number): number[] { return [p % Point.width, Math.floor(p / Point.width)]; }

    static up(p: number, times: number = 1): number { return p - times * Point.width; }
    static down(p: number, times: number = 1): number { return p + times * Point.width; }
    static left(p: number, times: number = 1): number { return p - times; }
    static right(p: number, times: number = 1): number { return p + times; }
    static upLeft(p: number, times: number = 1): number { return p - times - times * Point.width; }
    static upRight(p: number, times: number = 1): number { return p + times - times * Point.width; }
    static downLeft(p: number, times: number = 1): number { return p - times + times * Point.width; }
    static downRight(p: number, times: number = 1): number { return p + times + times * Point.width; }

    static cardinals(p: number, times: number = 1): number[] { return [Point.up(p, times), Point.down(p, times), Point.left(p, times), Point.right(p, times)]; }
    static diagonals(p: number, times: number = 1): number[] { return [Point.upLeft(p, times), Point.upRight(p, times), Point.downLeft(p, times), Point.downRight(p, times)]; }
    static neighborhood(p: number, times: number = 1): number[] { return [...Point.cardinals(p, times), ...Point.diagonals(p, times)]; }

    static distance(a: number, b: number): number { return Math.max(Math.abs(a % Point.width - b % Point.width), Math.floor(Math.abs(a - b) / Point.width)); }
    static toString(p: number): string { return Point.to2D(p).toString() }
}
