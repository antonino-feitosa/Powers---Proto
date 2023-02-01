
"use strict";

class Random {

    /** Class representing a uniform pseudorandom number generator.
    Implementation of xoshiro128** general-purpose 64-bit number generator with cyrb128 hash initialization.
    The javascript switch to 32-bit integer mode during bitwise operation (justifies the 128 version over 256).
    Implementation based on the stackoverflow discussion:
    @see {@link https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript| stackoverflow.com}
 */

    constructor(seed = 0) {
        let state = Random._cyrb128(String(seed));
        this.rand = Random._xoshiro128ss(state[0], state[1], state[2], state[3]);
    }

    _next() {
        return this.rand();
    }

    // Gets the next pseudorandom integer on the interval [0,`n`).
    nextInt(n) {
        if (n <= 0)
            throw new Error('The limit must be positive.');
        return this._next() % n;
    }

    // Gets the next pseudorandom integer on the interval [`min`,`max`).
    nextRange(min, max) {
        if (max <= min)
            throw new Error(`The maximum limit ${max} must be greater than the minimum ${min}.`);
        return min + this.nextInt(max - min);
    }

    // Gets the next pseudorandom real number on the interval [0,1).
    nextDouble() {
        return this._next() / 4294967296; // 2^32-1
    }

    // Gets the next pseudorandom boolean value.
    nextBoolean() {
        return this.nextDouble() >= 0.5;
    }

    pick(arr) {
        if (arr.length <= 0)
            throw new Error('The array must have at least one element!');
        let index = this.nextInt(arr.length);
        return arr[index];
    }

    shuffle(vet) {
        for (let i = vet.length - 1; i > 0; i--) {
            let index = this.nextInt(i);
            [vet[i], vet[index]] = [vet[index], vet[i]];
        }
    }

    sample(vet, size) {
        if (!vet || !vet.length || vet.length < size)
            throw new Error(`The array must have at least ${size} elements!`);
        let arr = [...vet];
        this.shuffle(arr);
        return arr.slice(0, size);
    }

    /** Hash function to extract no zero 128 seed from a string.*/
    static _cyrb128 = function (str) {
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
    static _xoshiro128ss = function (a, b, c, d) {
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



module.exports = {
    Random
}
