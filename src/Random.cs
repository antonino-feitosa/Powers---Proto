
namespace Powers
{
    public class Random
    {

        /**
         * Class representing a uniform pseudorandom number generator.
         * Implementation of xoshiro128** general-purpose 64-bit number generator with
         * cyrb128 hash initialization.
         * The javascript switch to 32-bit integer mode during bitwise operation
         * (justifies the 128 version over 256).
         * Implementation based on the stackoverflow discussion:
         * 
         * @see {@link https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript|
         *      stackoverflow.com}
         */

        protected String Seed;
        protected uint[] State;

        public Random(string seed = "0")
        {
            Seed = seed;
            State = Cyrb128(seed);
        }

        public Random(long seed) : this(seed.ToString()) { }

        // Gets the next pseudorandom integer on the interval [0,`n`).
        public int NextInt(int maxExclusive)
        {
            if (maxExclusive <= 0)
                throw new ArgumentException("The limit must be positive.");
            return Next() % maxExclusive;
        }

        // Gets the next pseudorandom integer on the interval [`min`,`max`).
        public int NextRange(int minInclusive, int maxExclusive)
        {
            if (maxExclusive <= minInclusive)
                throw new ArgumentException(String
                        .format("The maximum limit %d must be greater than the minimum %d.", maxExclusive, minInclusive));
            return minInclusive + this.nextInt(maxExclusive - minInclusive);
        }

        // Gets the next pseudorandom real number on the interval [0,1).
        public double nextDouble()
        {
            return this.next() / 4294967296d; // 2^32-1
        }

        // Gets the next pseudorandom boolean value.
        public boolean nextBoolean()
        {
            return (int)(this.next()) >= 0;
        }

        public <T> T pick(List<T> arr)
        {
            int index = pickIndex(arr);
            return arr.get(index);
        }

        public <T> int pickIndex(List<T> arr)
        {
            if (arr.isEmpty())
                throw new IllegalArgumentException("The array must have at least one element!");
            int index = nextInt(arr.size());
            return index;
        }

        public <T> List<T> shuffle(List<T> vet)
        {
            for (int i = vet.size() - 1; i > 0; i--)
            {
                int j = this.nextInt(i);
                T iaux = vet.get(i);
                T jaux = vet.get(j);
                vet.set(i, jaux);
                vet.set(j, iaux);
            }
            return vet;
        }

        // xoshiro128ss
        private uint Next()
        {
            uint tmp = State[1] << 9;
            uint result = State[0] * 5;
            result = (result << 7 | result >>> 25) * 9;
            State[2] ^= State[0];
            State[3] ^= State[1];
            State[1] ^= State[2];
            State[0] ^= State[3];
            State[2] ^= tmp;
            State[3] = State[3] << 11 | State[3] >> 21;
            return result;
        }

        /** Hash function to extract no zero 128 seed from a string. */
        private static uint[] Cyrb128(string seed)
        {
            uint[] state = new uint[] { 1779033703U, 3144134277U, 1013904242U, 2773480762U };
            foreach (char k in seed)
            {
                state[0] = state[1] ^ (state[0] ^ k * 597399067U);
                state[1] = state[2] ^ (state[1] ^ k * 2869860233U);
                state[2] = state[3] ^ (state[2] ^ k * 951274213U);
                state[3] = state[0] ^ (state[3] ^ k * 2716044179U);
            }
            state[0] = (state[2] ^ (state[0] >>> 18)) * 597399067U;
            state[1] = (state[3] ^ (state[1] >>> 22)) * 2869860233U;
            state[2] = (state[0] ^ (state[2] >>> 17)) * 951274213U;
            state[3] = (state[1] ^ (state[3] >>> 19)) * 2716044179U;
            return new uint[] { state[0] ^ state[1] ^ state[2] ^ state[3], state[1] ^ state[0], state[2] ^ state[0],
                state[3] ^ state[0] };
        }
    }
}