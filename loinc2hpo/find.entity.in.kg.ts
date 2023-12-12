import gremlin from "gremlin";
import _ from "lodash";

import { bty, consoleProgress, Counter, doInParallel, parseCSV } from "../mods/util";
import { Logger } from "../mods/logger";


const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

// const endpoint = "wss://dev.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY
const endpoint = "wss://dev-instance-2.csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY

const dc = new DriverRemoteConnection(endpoint, {});

const counter = new Counter();
const eStats = new Counter();

const graph = new Graph();
const g = graph.traversal().withRemote(dc);

interface ReportRowData {
    from: string;
    to: string;
    eType: string;
    eLbl: string;
};

type NodeType = "concept" | "atom";

interface GraphNode {
    id: string;
    label: string;
    type?: NodeType;
    node_tty?: string;
};

const CHUNK_SIZE = 50;
const source = "loinc2hpo";

console.time("script duration");

const srcFileName = "./loinc2hpo/annotations.csv";
const dstFileName = "./loinc2hpo/edges.loinc.hpo.csv";

const loincField = "loincId";
const hpoField = "hpoTermId";
const uploadDate = new Date().toISOString();

const eConfig = {
    "L": ["Low result phenotype present", "Diagnosed by low result"],
    "H": ["High result phenotype present", "Diagnosed by high result"],
    "N": ["Normal result phenotype absent", "Absence diagnosed by normal result"],
    "NEG": ["Negative result phenotype absent", "Absence diagnosed by negative result"],
    "POS": ["Positive result phenotype present", "Diagnosed by positive result"],
    "NOM": ["Nominal result phenotype present", "Diagnosed by nominal result"],
};

const eTypes: string[] = Object.keys(eConfig);

const headerEdges = [
    "~id",
    "~from",
    "~to",
    "~label",
    "edge_text:String(single)",
    "edge_source_1:String(single)",
    "uploaded_at:Date(single)"
];

const logEdge = async (rowData: ReportRowData, csv: Logger) => {
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
    eStats.add(`${eType} edges created`);
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

const normalizeNodes = (nodesArr: any[]): GraphNode[] => nodesArr.map(item => JSON.parse(JSON.stringify(Object.fromEntries(item))));

const getNode = async (key: string, value: string): Promise<GraphNode[]> => {
    const nodes: GraphNode[] = normalizeNodes(await g.V().has(key, value).elementMap().toList());
    return nodes;
};

const getConcept = async (key: string, value: string): Promise<GraphNode[]> => {
    const nodes: GraphNode[] = normalizeNodes(await g.V().has(key, value).elementMap().toList());
    return nodes.filter(node => node.type === "concept");
};


const normalizeName = nodeName => {
    return nodeName
        .replace(/[,.;:]/g, " ")
        .replace(/_/g, " ")
        .replace(/  /g, " ")
};

(async () => {
    const report = new Logger(dstFileName, { header: headerEdges, withQuotes: "IfNeeded", separator: "," });
    await report.clear();

    const dataSet = await parseCSV(srcFileName, { separator: "," });
    let current = 0;
    const handled = new Map();


    for (const dataSubSet of _.chunk(dataSet, CHUNK_SIZE)) {
        await doInParallel(dataSubSet, async (dataRow) => {
            consoleProgress(++current, dataSet.length);
            // const lioncId = dataRow[loincField];
            // const hpoId = dataRow[hpoField];
            const {
                [loincField]: lioncId,
                [hpoField]: hpoId,
                outcome: eType,
            } = dataRow;

            if (!eTypes.includes(eType)) {
                return counter.add("rows skipped due to unknown relation");
            }

            let loincNodeId = handled.get(lioncId);
            if (!loincNodeId) {
                const nodes = await getNode("node_code", lioncId);
                const concepts = nodes.filter(node => node.type === "concept");
                
                if (concepts.length === 0 && nodes.length === 1) {
                    concepts.push(nodes[0]);
                }
                
                if (concepts.length === 0 && nodes.length > 0) {
                    const lcAtom = nodes.find(atom => atom.node_tty === "LC");
                    if (lcAtom) concepts.push(lcAtom);
                }
                
                counter.add(`lionc -> ${concepts.length}`);
                
                loincNodeId = concepts?.[0]?.id;
                handled.set(lioncId, loincNodeId);
            }

            let hpoNodeId = handled.get(hpoId);
            if (!hpoNodeId) {
                const nodes = await getNode("node_code", hpoId);
                const concepts = nodes.filter(node => node.type === "concept" && node.node_tty === "PT");
                
                if (concepts.length === 0 && nodes.length === 1) {
                    concepts.push(nodes[0]);
                }

                const nodesWoSy = nodes.filter(atom => atom.node_tty !== "SY");
                if (concepts.length === 0 && nodesWoSy.length === 1) {
                    concepts.push(nodesWoSy[0]);
                }
                
                if (concepts.length === 0 && nodes.length > 0) {
                    const lcAtom = nodes.find(atom => atom.node_tty === "PT");
                    if (lcAtom) concepts.push(lcAtom);
                }

                
                if (concepts.length > 1) {
                    console.log(nodes);
                    process.exit(0);
                }
                
                counter.add(`hpo -> ${concepts.length}`);
                hpoNodeId = concepts?.[0]?.id;
                handled.set(hpoId, hpoNodeId);
            }

            if (loincNodeId && hpoNodeId) {
                try {
                    const [directLbl, invertedLbl] = eConfig[eType]
                    await logEdgesPair({ from: loincNodeId, to: hpoNodeId, directLbl, invertedLbl }, report);
                } catch (e) {
                    console.error(e);
                    console.log({ eType, lioncId, hpoId });
                    process.exit(0)
                }
            } else {
                counter.add("missed loinc or hpo code");
            }
        });
    }

    dc.close();
    console.log(counter.getAsArr());
    console.log(eStats.getAsArr());
    console.timeEnd("script duration");
})();
