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

console.time("script duration");

const nodesFileTemplate = "./dbpedia/nodes.*.csv";
const edgesFileTemplate = "./dbpedia/edges.*.csv";

const counter = new Counter();

(async () => {
    for (const entity of entities) {

        const nodesFileName = nodesFileTemplate.replace(/\*/g, entity);
        const edgesFileName = edgesFileTemplate.replace(/\*/g, entity);

        const edgesArr = await parseCSV(edgesFileName, { separator: "," });
        const edgesIds: Set<string> = edgesArr.reduce((accum, dataRow) => {
            const {
                "~from": from,
            } = dataRow;

            accum.add(from);

            return accum;
        }, new Set());

        for (const nodeId of Array.from(edgesIds)) {
            const ontology = nodeId.split("_").shift();
            if ("dbpedia" === ontology) continue;

            counter.add(`${entity}: edges to ${ontology}`);
        }

        const dataSet = await parseCSV(nodesFileName);
        counter.add(`${entity}: nodes in total`, dataSet.length)
        // END OF ENTITIES CYCLE
    }

    console.log(counter.getAsArr());
    console.timeEnd("script duration");
})();
