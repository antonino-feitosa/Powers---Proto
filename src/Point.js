
"use strict";
class Point {
    static width = 10000;
    static xcenter = 5000;
    static ycenter = 5000;

    static from(x, y) { return (y + Point.ycenter) * Point.width + (x + Point.xcenter); }
    static to2D(p) { return [p % Point.width - Point.xcenter, Math.floor(p / Point.width) - Point.ycenter]; }

    static up(p, times = 1) { return p - times * Point.width; }
    static down(p, times = 1) { return p + times * Point.width; }
    static left(p, times = 1) { return p - times; }
    static right(p, times = 1) { return p + times; }
    static upLeft(p, times = 1) { return p - times - times * Point.width; }
    static upRight(p, times = 1) { return p + times - times * Point.width; }
    static downLeft(p, times = 1) { return p - times + times * Point.width; }
    static downRight(p, times = 1) { return p + times + times * Point.width; }

    static cardinals(p, times = 1) { return [Point.up(p, times), Point.down(p, times), Point.left(p, times), Point.right(p, times)]; }
    static diagonals(p, times = 1) { return [Point.upLeft(p, times), Point.upRight(p, times), Point.downLeft(p, times), Point.downRight(p, times)]; }
    static neighborhood(p, times = 1) { return [...Point.cardinals(p, times), ...Point.diagonals(p, times)]; }

    static distance(a, b) { return Math.abs(a % Point.width - b % Point.width) + Math.floor(Math.abs(a - b) / Point.width); }
    static toString(p) { return Point.to2D(p).toString() }
}

module.exports = {
    Point
}
