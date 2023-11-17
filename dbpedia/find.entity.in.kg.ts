import gremlin from "gremlin";
import _ from "lodash";

import { bty, consoleProgress, Counter, doInParallel, parseCSV } from "../mods/util";
import { Logger } from "../mods/logger";


const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

const endpoint = "wss://dev.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY

const dc = new DriverRemoteConnection(endpoint, {});

const graph = new Graph();
const g = graph.traversal().withRemote(dc);

const entities = [
    // "drug",
    // "disease",
    // "chemical",
    // "gene",
    "proteins",
];


console.time("script duration");

const srcFileTemplate = "./dbpedia/data.*.csv";
const dstFileTemplate = "./dbpedia/found.in.kg.*.csv";

interface GraphNode {
    id: string;
    label: string;
};


const getNode = (key: string, value: string): Promise<GraphNode[]> => {
    return g.V().has(key, value).toList().
        then(data => {
            const resp = JSON.parse(JSON.stringify(data));
            
            return resp;
        }).catch(error => {
            console.log("ERROR", error);
            // dc.close();
        });
};

const counter = new Counter();

const relevantEntities = [];
const irrelevantEntities = [];

const normalizeName = nodeName => {
    return nodeName
        .replace(/[,.;:]/g, " ")
        .replace(/_/g, " ")
        .replace(/  /g, " ")
};


(async () => {

    for (const entity of entities) {
        const srcFileName = srcFileTemplate.replace(/\*/g, entity);
        const dstFileName = dstFileTemplate.replace(/\*/g, entity);
        const report = new Logger(dstFileName, { header: ["code", "kg_node", "label"] });
        await report.clear();

        const dataSet = await parseCSV(srcFileName);
        
        const dataChunks = _.chunk(dataSet, 50);

        let current = 0;
        let found = 0;
        const labels = new Set();
        for (const dataSubSet of dataChunks) {
            await doInParallel(dataSubSet, async ({ id }) => {
                let nodes: GraphNode[] = await getNode("node_name", id);
                if (!nodes) return console.log("UNABLE TO FIND NODES", id);
                if (!nodes.length) nodes = await getNode("node_name", id.toLowerCase());
                if (!nodes.length) nodes = await getNode("node_name", normalizeName(id));
                if (!nodes.length) nodes = await getNode("node_code", id.toLowerCase());
                // console.log(id, node);
                if (nodes.length) {
                    found++;
                    for (const node of nodes) {
                        node.label.split("::").forEach(label => labels.add(label));
                        await report.write([id, node.id, node.label]);
                        counter.add(`${entity} relations`);
                    }
                } else {
                    await report.write([id, "NOT FOUND"]);
                    counter.add(`${entity} related entities not found`);
                }
                consoleProgress(++current, dataSet.length, { label: found.toString() })
            });
        }
        counter.add(`${entity} related entities found`, found);
        console.log(entity, "labels:\n", Array.from(labels).sort().join("\n"));


        dc.close();
        // END OF ENTITIES CYCLE
    }
    console.log(counter.getAsArr());
    console.timeEnd("script duration");
})();
