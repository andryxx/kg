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
    // "disease",
    // "chemical",
    // "gene",
    // "proteins",
];

const headerEdges = [
    "~id",
    "~from",
    "~to",
    "~label",
    "edge_text:String",
    "edge_source_1:String",
    "uploaded_at:Date"
];

const FRAME = 50;

console.time("script duration");

const srcFileTemplate = "./dbpedia/nodes.*.csv";
const mappingFileTemplate = "./dbpedia/mapping.*.csv";
const orphansFileTemplate = "./dbpedia/orphans.*.csv";
// const mappingFileTemplate = "./dbpedia/";
// const mappingFileTemplate = "";

const edgesFileTemplate = "./dbpedia/edges.*.csv";

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

interface edgeRow {
    from: string;
    to: string;
    eType: string;
    eLbl: string;
};

const logEdge = async (rowData: edgeRow, csv: Logger) => {
    if (!csv) throw new Error("The logger object not defined");

    const { from, to, eType, eLbl } = rowData;
    await csv.write([
        [from, eType, to].join("-"), // "~id",
        from, // "~from",
        to, // "~to",
        eType, // "~label",
        eLbl, // "edge_text:String",
        source, // "edge_source_1:String",
        uploadDate, // "uploaded_at:Date"
    ]);
};

const logEdgesPair = async ({ from, to, directLbl, invertedLbl }, csv): Promise<void> => {
    await logEdge({
        from,
        to,
        eType: directLbl.toLowerCase().replace(/ /g, "_"),
        eLbl: directLbl,
    }, csv);

    await logEdge({
        from: to,
        to: from,
        eType: invertedLbl.toLowerCase().replace(/ /g, "_"),
        eLbl: invertedLbl,
    }, csv);
};

const unknown = new Set();
const handleNodes = async (srcNodeId: string, dstNodes: GraphNode[], relevantLabels: string[], irrelevantLabels: string[], entity: string, csv: Logger): Promise<boolean> => {
    let result = false;
    for (const node of dstNodes) {
        const labels: string[] = node.label.split("::");
        const relevant = labels.some(label => relevantLabels.includes(label));

        if (!relevant) {
            counter.add(`${entity}: irrelevant references skipped`);
            for (const label of labels) {
                if (irrelevantLabels.includes(label)) continue;
                unknown.add(label);
            }
            continue;
        }

        counter.add(`${entity}: relevant references added`);
        result = true;

        await logEdgesPair({
            from: srcNodeId,
            to: node.id,
            directLbl: "article_of",
            invertedLbl: "has_article"
        }, csv)

        counter.add(`${entity} relations pairs`);
    }
    return result;
};

const normalizeName = (nodeName: string): string => {
    return nodeName.replace(/[,.:;_]+/g, " ").replace(/\s+/g, " ").trim();
};

(async () => {
    for (const entity of entities) {
        const mapping = {};
        const edges = {};
        const { relevant, irrelevant } = graphCategories[entity];

        const mappingCsv = await parseCSV(mappingFileTemplate.replace(/\*/g, entity));

        const ontoList = Object.keys(mappingCsv?.[0] || {}).filter(ont => ont !== "nodeId");
        for (const dataRow of mappingCsv) {
            for (const ontology of ontoList) {
                if (!dataRow[ontology]) continue;
                if (!mapping[dataRow.nodeId]) mapping[dataRow.nodeId] = {};
                mapping[dataRow.nodeId][ontology] = dataRow[ontology];
            }
        }

        const srcFileName = srcFileTemplate.replace(/\*/g, entity);
        const edgesFileName = edgesFileTemplate.replace(/\*/g, entity);
        const orphansFileName = orphansFileTemplate.replace(/\*/g, entity);
        const edgesCsv = new Logger(edgesFileName, { header: headerEdges, withQuotes: "IfNeeded", separator: "," });
        const orphansCsv = new Logger(orphansFileName, { header: ["nodeId", "nodeName", "abstract", "keys"], withQuotes: "IfNeeded", separator: "," });
        await edgesCsv.clear();
        await orphansCsv.clear();

        const dataSet = await parseCSV(srcFileName);

        const dataChunks = _.chunk(dataSet, FRAME);

        let current = 0;
        let found = 0;
        let notfound = 0;
        const labels = new Set();
        for (const dataSubSet of dataChunks) {
            await doInParallel(dataSubSet, async (dataRow) => {
                consoleProgress(current++, dataSet.length, { label: `${found.toString()}/${notfound.toString()}` })

                const {
                    "~id": nodeId,
                    "node_name:String(single)": nodeNameOrigin,
                    "abstract:String(single)": abstract,
                } = dataRow;
                const nodeName = nodeNameOrigin.replace(/,/g, "");

                const xrefs = mapping[nodeId] || {};

                let refFound = false;

                for (const onto of Object.keys(xrefs)) {
                    const nodes = await getConceptOfNode("node_code", xrefs[onto]);
                    if (!nodes.length) continue;
                    refFound = await handleNodes(nodeId, nodes, relevant, irrelevant, entity, edgesCsv) || refFound;
                    if (refFound) counter.add(`${entity}: relevant references added`);
                }

                if (refFound) {
                    found++;
                    return counter.add(`${entity}: linked nodes (by code)`);
                }


                let nodes: GraphNode[] = await getConceptOfNode("node_name", nodeName);
                if (!nodes.length) nodes = await getConceptOfNode("node_name", nodeName.toLowerCase());
                if (!nodes.length) nodes = await getConceptOfNode("node_name", normalizeName(nodeName));
                refFound = await handleNodes(nodeId, nodes, relevant, irrelevant, entity, edgesCsv) || refFound;

                if (refFound) {
                    found++;
                    counter.add(`${entity}: relevant references added`);
                    return counter.add(`${entity}: linked nodes (by node name)`);
                }

                nodes = await getConceptOfNode("node_code", nodeName);
                refFound = await handleNodes(nodeId, nodes, relevant, irrelevant, entity, edgesCsv) || refFound;

                if (refFound) {
                    found++;
                    counter.add(`${entity}: relevant references added`);
                    return counter.add(`${entity}: linked nodes (by node name as code)`);
                }

                if (entity === "gene" && abstract) {
                    // e.g. -> encoded by the PRKCA gene.
                    const wordsArr: string[] = abstract.replace(/[()\.]/g, "").split(" ");
                    const checkPhraseArr = [];
                    if (wordsArr.length) checkPhraseArr.push(wordsArr.pop()); // gene
                    const geneName = wordsArr.length ? wordsArr.pop() : ""; // PRKCA
                    if (wordsArr.length) checkPhraseArr.push(wordsArr.pop()); // the
                    if (wordsArr.length) checkPhraseArr.push(wordsArr.pop()); // by
                    if (wordsArr.length) checkPhraseArr.push(wordsArr.pop()); // encoded

                    const genesInText = wordsArr.filter(word => word.length > 2 && word.toUpperCase() === word).filter(gene => gene !== geneName);

                    if (checkPhraseArr.reverse().join(" ") === "encoded by the gene" && genesInText.length === 0) {
                        nodes = await getConceptOfNode("node_code", geneName);
                        refFound = await handleNodes(nodeId, nodes, relevant, irrelevant, entity, edgesCsv) || refFound;

                        if (!refFound) {
                            nodes = await getConceptOfNode("node_name", geneName);
                            refFound = await handleNodes(nodeId, nodes, relevant, irrelevant, entity, edgesCsv) || refFound;
                        }
                    }
                }

                if (refFound) {
                    found++;
                    counter.add(`${entity}: relevant references added`);
                    return counter.add(`${entity}: linked nodes (by symantic analyse)`);
                }

                counter.add(`${entity}: unlinked nodes`);
                await orphansCsv.write([
                    nodeId, // "nodeId",
                    nodeName, // "nodeName",
                    abstract, // "abstract",
                    "", // "keys",
                ]);
                notfound++;
            });
        }
        counter.add(`${entity} related entities found`, found);
        console.log(entity, "labels:\n", Array.from(labels).join("\n"));


        dc.close();
        // END OF ENTITIES CYCLE
    }
    console.log(counter.getAsArr());
    if (unknown.size > 0) console.log(`UNKNOWN LABELS\n${Array.from(unknown).join("\n")}`);
    console.timeEnd("script duration");
})();
