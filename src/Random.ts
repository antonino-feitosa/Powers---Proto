
export class Random {

    /** Class representing a uniform pseudorandom number generator.
    Implementation of xoshiro128** general-purpose 64-bit number generator with cyrb128 hash initialization.
    The javascript switch to 32-bit integer mode during bitwise operation (justifies the 128 version over 256).
    Implementation based on the stackoverflow discussion:
    @see {@link https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript| stackoverflow.com}
 */

    rand: () => number;

    constructor(seed = 0) {
        let state = Random._cyrb128(String(seed));
        this.rand = Random._xoshiro128ss(state[0], state[1], state[2], state[3]);
    }

    _next(): number {
        return this.rand();
    }

    // Gets the next pseudorandom integer on the interval [0,`n`).
    nextInt(nExclusive: number): number {
        if (nExclusive <= 0)
            throw new Error('The limit must be positive.');
        return this._next() % nExclusive;
    }

    // Gets the next pseudorandom integer on the interval [`min`,`max`).
    nextRange(minInclusive: number, maxExclusive: number): number {
        if (maxExclusive <= minInclusive)
            throw new Error(`The maximum limit ${maxExclusive} must be greater than the minimum ${minInclusive}.`);
        return minInclusive + this.nextInt(maxExclusive - minInclusive);
    }

    // Gets the next pseudorandom real number on the interval [0,1).
    nextDouble(): number {
        return this._next() / 4294967296; // 2^32-1
    }

    // Gets the next pseudorandom boolean value.
    nextBoolean(): boolean {
        return this.nextDouble() >= 0.5;
    }

    pick<T>(arr: T[]): T {
        if (arr.length <= 0)
            throw new Error('The array must have at least one element!');
        let index = this.nextInt(arr.length);
        return arr[index];
    }

    pickIndex<T>(arr: T[]): number {
        if (arr.length <= 0)
            throw new Error('The array must have at least one element!');
        let index = this.nextInt(arr.length);
        return index;
    }

    shuffle<T>(vet: T[]): void {
        for (let i = vet.length - 1; i > 0; i--) {
            let index = this.nextInt(i);
            [vet[i], vet[index]] = [vet[index], vet[i]];
        }
    }

    sample<T>(vet: T[], size: number): T[] {
        if (!vet || !vet.length || vet.length < size)
            throw new Error(`The array must have at least ${size} elements!`);
        let arr = [...vet];
        this.shuffle(arr);
        return arr.slice(0, size);
    }

    /** Hash function to extract no zero 128 seed from a string.*/
    private static _cyrb128 = function (str: string): number[] {
        let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
        for (let i = 0, k; i < str.length; i++) {
            k = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
    }

    /** Creates xoshiro128** with states a, b, c, d (32-bit integer each) generating 32-bit random integers*/
    private static _xoshiro128ss = function (a: number, b: number, c: number, d: number): () => number {
        return function () {
            let t = b << 9, r = a * 5;
            r = (r << 7 | r >>> 25) * 9;
            c ^= a;
            d ^= b;
            b ^= c;
            a ^= d;
            c ^= t;
            d = d << 11 | d >>> 21;
            return (r >>> 0);
        };
    }
}
