console.time("script");
import mondo from "./mondo/mondo.json";

const graph: any = mondo;

const graphs: any = graph.graphs[0];
const keys = Object.keys(graphs);

console.log({ keys }, "len ->", keys.length);
console.timeEnd("script");