

let x: Map<number,string> = new Map<number, string>();
for(let p in x.keys()){
    console.log(typeof p);
}