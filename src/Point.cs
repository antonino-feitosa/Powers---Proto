
namespace Powers
{
    public class Point
    {
        public readonly int X;
        public readonly int Y;

        public Point(int x = 0, int y = 0)
        {
            this.X = x;
            this.Y = y;
        }

        public Point(Point point) : this(point.X, point.Y) { }

        public int compareX(Point other)
        {
            return X - other.X;
        }

        public int compareY(Point other)
        {
            return Y - other.Y;
        }

        public int distance(Point other)
        {
            return (int)Math.Max(Math.Abs(X - other.X), MathF.Floor(Math.Abs(Y - other.Y)));
        }

        public Point Up(int times = 1)
        {
            return new Point(X, Y - times);
        }

        public Point Down(int times = 1)
        {
            return new Point(X, Y + times);
        }

        public Point Left(int times = 1)
        {
            return new Point(X - times, Y);
        }

        public Point Right(int times = 1)
        {
            return new Point(X + times, Y);
        }

        public Point UpLeft(int times = 1)
        {
            return new Point(X - times, Y - times);
        }

        public Point UpRight(int times = 1)
        {
            return new Point(X + times, Y - times);
        }

        public Point DownLeft(int times = 1)
        {
            return new Point(X - times, Y + times);
        }

        public Point DownRight(int times = 1)
        {
            return new Point(X + times, Y + times);
        }

        public List<Point> Cardinals(int times = 1)
        {
            return new List<Point> { Up(times), Down(times), Left(times), Right(times) };
        }

        public List<Point> Diagonals(int times = 1)
        {
            return new List<Point> { UpLeft(times), UpRight(times), DownLeft(times), DownRight(times) };
        }

        public List<Point> Neighborhood(int times = 1)
        {
            return new List<Point>{Up(times), Down(times), Left(times), Right(times), UpLeft(times), UpRight(times),
                DownLeft(times), DownRight(times)};
        }

        public override int GetHashCode()
        {
            return (Y << 16) | X;
        }

        public override bool Equals(Object? obj)
        {
            if (obj == null)
            {
                return false;
            }
            Point? point = obj as Point;
            if (point == null)
            {
                return false;
            }
            if (base.Equals(obj))
            {
                return true;
            }
            return X == point.X && Y == point.Y;
        }

        public override string ToString()
        {
            return string.Format("({}, {})", X, Y);
        }
    }
}
