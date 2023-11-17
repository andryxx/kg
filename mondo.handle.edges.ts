console.time("script");
import jsonData from "./mondo/edges.json";

const data: any = jsonData;
const edges: Array<any> = data;

const counter: any = {
    proper: 0,
    missed: 0, // missed legal key
    extra: 0, // extra key
    both: 0, // missed & extra
};

const legalKeys = [ "sub", "pred", "obj" ];
let extras = new Set();

for (const edge of edges) {
    let result = 0;
    let extra = false;

    const edgeKeys = Object.keys(edge);
    for (const key of edgeKeys) {
        if (legalKeys.includes(key)) continue;
        const extraKeys = Object.keys(edge.meta)
        for (const eKey of extraKeys) extras.add(eKey);
        extra = true;
    }
    if (extra) result += 1; // extra
    
    for (const key of legalKeys) {
        if (edgeKeys.includes(key)) continue;
        result += 2; // missed
        break;
    }

    let cntKey = "proper";
    if (result === 1) cntKey = "extra";
    else if (result === 2) cntKey = "missed";
    else if (result === 3) cntKey = "both";

    counter[cntKey]++;
}

console.log( "len ->", edges.length, {counter, extras});
console.timeEnd("script");