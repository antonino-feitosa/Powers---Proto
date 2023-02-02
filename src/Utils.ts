
export function minimumIndex<T>(array: T[], cmp: (a: T, b: T) => number): number {
    let min = -1;
    for (let i = 0; i < array.length; i++) {
        if (min === -1 || cmp(array[i], array[min]) < 0) {
            min = i;
        }
    }
    return min;
}

export function range(start: number, length: number, call: (index: number) => void): void {
    console.assert(length >= 0, `length ${length} must be postive!`);
    for (let i = start; i < start + length; i++)
        call(i)
};
