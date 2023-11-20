import gremlin from "gremlin";
import _ from "lodash";

import { bty, consoleProgress, Counter, doInParallel, parseCSV } from "../mods/util";
import { Logger } from "../mods/logger";


const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

// const endpoint = "wss://dev.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY
const endpoint = "wss://dev-instance-2.csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY

const dc = new DriverRemoteConnection(endpoint, {});

const graph = new Graph();
const g = graph.traversal().withRemote(dc);

const entities = [
    // "drug",
    "disease",
    // "chemical",
    // "gene",
    // "proteins",
];

const CHUNK_SIZE = 50;

console.time("script duration");

const srcFileTemplate = "./dbpedia/data.*.csv";
const dstFileTemplate = "./dbpedia/found.in.kg.*.csv";

type NodeType = "concept" | "atom";

interface GraphNode {
    id: string;
    label: string;
    type?: NodeType;
};

const normalizeNodes = (nodesArr: any[]): GraphNode[] => nodesArr.map(item => JSON.parse(JSON.stringify(Object.fromEntries(item))));

const getConceptOfNode = async (key: string, value: string): Promise<GraphNode[]> => {
    const conceptsIds: Set<string> = new Set();
    const theNodes = normalizeNodes(await g.V().has(key, value).elementMap().toList());

    let atoms: GraphNode[] = theNodes.filter(node => node.type !== "concept");
    await doInParallel(atoms, async (atom: GraphNode) => {
        const concepts: GraphNode[] = normalizeNodes(await g.V(atom.id).out("is_atom_of").elementMap().toList());
        theNodes.push(...concepts);
        if (concepts.length === 0) conceptsIds.add(atom.id);
        else concepts.forEach(concept => conceptsIds.add(concept.id));
    });

    return Array.from(conceptsIds).map(nodeId => theNodes.find(node => node.id === nodeId));
};

const counter = new Counter();

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

        const dataChunks = _.chunk(dataSet, CHUNK_SIZE);

        let current = 0;
        let found = 0;
        const labels = new Set();
        for (const dataSubSet of dataChunks) {
            await doInParallel(dataSubSet, async ({ id }) => {
                let nodes: GraphNode[] = await getConceptOfNode("node_name", id);
                if (!nodes) return console.log("UNABLE TO FIND NODES", id);
                if (!nodes.length) nodes = await getConceptOfNode("node_name", id.toLowerCase());
                if (!nodes.length) nodes = await getConceptOfNode("node_name", normalizeName(id));
                if (!nodes.length) nodes = await getConceptOfNode("node_code", id.toLowerCase());
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
                consoleProgress(++current, dataSet.length, { label: found.toString() });
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
