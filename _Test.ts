
import { Point } from './src/Point';



let x = Point.center;

Point.neighborhood(x).forEach(n => console.log(Point.to2D(n), n, Point.from(Point.to2D(n)[0], Point.to2D(n)[1])));

