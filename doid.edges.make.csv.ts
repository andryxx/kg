console.time("script");
import moment from "moment";

import { Logger } from "./mods/logger";
import edgesJsonData from "./doid/edges.json";

interface edge {
    obj: string;
    pred: string;
    sub: string;
};

const eTypes = {
    "http://purl.obolibrary.org/obo/RO_0001022": "has allergic trigger",
    "http://purl.obolibrary.org/obo/RO_0004026": "disease has location",
    "http://purl.obolibrary.org/obo/RO_0002488": "existence starts during",
    "http://purl.obolibrary.org/obo/RO_0002452": "has symptom",
    "http://purl.obolibrary.org/obo/RO_0002451": "transmitted by",
    "http://purl.obolibrary.org/obo/RO_0004029": "disease has feature",
    "http://purl.obolibrary.org/obo/RO_0002200": "has phenotype",
    "http://purl.obolibrary.org/obo/RO_0004019": "disease has basis in",
    "http://purl.obolibrary.org/obo/RO_0007001": "has disease driver",
    "http://purl.obolibrary.org/obo/RO_0001000": "derives from",
    "http://purl.obolibrary.org/obo/RO_0002220": "adjacent to",
    "http://purl.obolibrary.org/obo/so#has_origin": "has origin",
    "http://purl.obolibrary.org/obo/IDO_0000664": "has material basis in"
};

const data: any = edgesJsonData;
const edges: Array<edge> = data;

const edgesCsvFile = "./doid/edges.csv";
const csv = new Logger(edgesCsvFile, {
    withQuotes: false, separator: ",", header: [
        "~id",
        "~from",
        "~to",
        "~label",
        "edge_text:String",
        "edge_source_1:String",
        "uploaded_at:Date"
    ]
});

const edgeTypes = new Set<string>;

const counter: any = {
    handled: 0,
};

const today = moment().format("YYYY-MM-DD");

(async () => {
    await csv.clear();

    for (const edge of edges) {
        const eLbl = eTypes[edge.pred] || edge.pred;
        const eType = eLbl.replace(/ /g, "_");
        const from = edge.sub.split("/").pop().toLowerCase();
        const to = edge.obj.split("/").pop().toLowerCase();
        
        await csv.write([
            [from, eType, to].join("-"), // "~id",
            from, // "~from",
            to, // "~to",
            eType, // "~label",
            eLbl, // "edge_text:String",
            "doid", // "edge_source_1:String",
            today, // "uploaded_at:Date"
        ]);
        counter.handled++;
        // if(counter.handled % 25 === 0) break;
    }
    
    console.log({
        total_edges: edges.length,
        total_nodes: Object.keys(eTypes).length,
        counter,
        edges_types: edgeTypes.size,
    });
})();


console.timeEnd("script");