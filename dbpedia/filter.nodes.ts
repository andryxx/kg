import gremlin from "gremlin";
import _ from "lodash";

import { bty, consoleProgress, Counter, doInParallel, parseCSV } from "../mods/util";
import { Logger } from "../mods/logger";

import graphCategories from "./relevants.json";

const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

const endpoint = "wss://dev-instance-2.csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY

const dc = new DriverRemoteConnection(endpoint, {});

const graph = new Graph();
const g = graph.traversal().withRemote(dc);

const source = "dbpedia";
const uploadDate = "2023-11-15";

const entities = [
    "drug",
    "disease",
    "chemical",
    "gene",
    "proteins",
];

const header = [
    "~id",
    "~label",
    "abstract:String(single)",
    "node_code:String(single)",
    "node_name:String(single)",
    "node_source_1:String(single)",
    "node_source_2:String(single)",
    "uploaded_at:Date",
];

console.time("script duration");

const nodesFileTemplate = "./dbpedia/nodes.*.csv";
const bkpFileTemplate = "./dbpedia/nodes.*.bkp.csv";
const edgesFileTemplate = "./dbpedia/edges.*.csv";

const counter = new Counter();

(async () => {
    for (const entity of entities) {

        const nodesFileName = nodesFileTemplate.replace(/\*/g, entity);
        const edgesFileName = edgesFileTemplate.replace(/\*/g, entity);
        const bkpFileName = bkpFileTemplate.replace(/\*/g, `${entity}.${new Date().getTime()}`);

        const edgesArr = await parseCSV(edgesFileName, { separator: "," });
        const edgesIds: Set<string> = edgesArr.reduce((accum, dataRow) => {
            const {
                "~from": from,
                "~to": to
            } = dataRow;

            accum.add(from);
            accum.add(to);
                    
            return accum;
        }, new Set());

        const bkpCsv = new Logger(bkpFileName, { header, withQuotes: "IfNeeded", separator: "," });
        const dataSet = await parseCSV(nodesFileName);
        
        for (const dataRow of dataSet) {
            const bkpRow = [];
            for (const column of header) bkpRow.push(dataRow[column]);
            await bkpCsv.write(bkpRow);
        }
        
        const nodesCsv = new Logger(nodesFileName, { header, withQuotes: "IfNeeded", separator: "," });
        await nodesCsv.clear();
        for (const dataRow of dataSet) {
            const nodeId = dataRow["~id"];
            if (!edgesIds.has(nodeId)) {
                counter.add(`${entity}: skipped`)
                continue;
            }
    
            const repRow = [];
            for (const column of header) repRow.push(dataRow[column]);
            await nodesCsv.write(repRow);
            counter.add(`${entity}: nodes for load`)

        }

        // END OF ENTITIES CYCLE
    }

    console.log(counter.getAsArr());
    console.timeEnd("script duration");
})();
