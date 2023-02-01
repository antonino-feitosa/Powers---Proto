
//https://github.com/dd-pardal/tty-events/blob/master/index.js

if (process.stdin.isTTY)
	process.stdin.setRawMode(true);

const term = new (require("tty-events"));

term.enableMouse();

term.on("mousedown", (ev)=>{
	console.log("You clicked at (%i, %i) with the button no. %i.", ev.x, ev.y, ev.button);
});