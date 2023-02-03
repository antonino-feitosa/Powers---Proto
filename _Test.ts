

let x = new Array<number[]>(5).fill([]);
x.forEach((_,index) => x[index] = [index]);

console.log(x);