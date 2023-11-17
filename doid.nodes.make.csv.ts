console.time("script");
import moment from "moment";

import { Logger } from "./mods/logger";
import jsonData from "./doid/nodes.json";

const data: any = jsonData;
const nodes: Array<any> = data;

const nodesCsvFile = "./doid/nodes.csv";
const csv = new Logger(nodesCsvFile, {
    withQuotes: "Never", separator: ",", header: [
        "~id", // ?	~id
        "~label", // ?	~label  // human_disease
        "node_tty:String",
        "node_tty_text:String",
        "node_code:String",
        `"node_name:String"`,
        "node_source_1:String",
        // ?	node_source_2:String
        // ?	type:String
        "uploaded_at:Date", // "YYYY-MM-DD"
    ]
});

const counter: any = {
    handled: 0,
};

const today = moment().format("YYYY-MM-DD");

(async () => {
    await csv.clear();

    for (const node of nodes) {
        const nodeId = node.id.split("/").pop().toLowerCase(); 
        await csv.write([
            nodeId, // ?	~id
            "human_disease", // ?	~label
            "DI", // ?	node_tty:String
            "Disease name", // ?	node_tty_text:String
            nodeId, // "node_code:String",
            `"${node.lbl}"`, // "node_name:String",
            "doid", // "node_source_1:String",
            // ?	node_source_2:String
            // ?	type:String
            today, // "uploaded_at:Date",
        ]);

        counter.handled++;
    }
    
    console.log({
        total_nodes: nodes.length,
        counter,
    });
})();


console.timeEnd("script");