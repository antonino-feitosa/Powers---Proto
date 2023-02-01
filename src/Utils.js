
"use strict";

function minimumIndex(array, cmp){
    let min = null;
    for(let i=0;i<array.length;i++){
        if(min === null || cmp(array[i], array[min]) < 0){
            min = i;
        }
    }
    return min;
}

function range(start, length, call) {
    console.assert(length >= 0, `length ${length} must be postive!`);
    for (let i = start; i < start + length; i++)
        call(i)
};

module.exports = {
    range,
    minimumIndex
}
