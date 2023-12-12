import gremlin from "gremlin";

import { doInParallel } from "./mods/util";

const DEBUG = true;

const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

const endpoint = "wss://dev-instance-2.csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY
const dc = new DriverRemoteConnection(endpoint, {});

const graph = new Graph();
const g = graph.traversal().withRemote(dc);
const __ = gremlin.process.statics;

const header = {
    nodes: [
        "~id",
        "~label",
        // "node_tty:String",
        // "node_tty_text:String",
        "node_code:String(single)",
        "node_name:String(single)",
        "node_source_1:String(single)",
        "node_source_2:String(single)",
        // "type:String(single)",
        "uploaded_at:Date(single)", // "YYYY-MM-DD"
    ],
    edges: [
        "~id",
        "~from",
        "~to",
        "~label",
        "edge_text:String",
        "edge_source_1:String",
        "uploaded_at:Date"
    ],
};

type NodeType = "concept" | "atom";

interface GraphNode {
    id: string;
    label: string;
    type?: NodeType;
    node_source_1?: string;
    node_source_2?: string;
    node_name?: string;
};

const normalizeNodes = (nodesArr: any[]): GraphNode[] => nodesArr.map(item => JSON.parse(JSON.stringify(Object.fromEntries(item))));

const getNode = async (key: string, value: string): Promise<GraphNode[]> => {
    if (DEBUG) console.log(">>>>>>>>>>>>> LAUNCH GREMLIN METHOD", {
        method: "getNode",
        key,
        value,
    });
    const nodes: GraphNode[] = normalizeNodes(await g.V().has(key, value).elementMap().toList());
    return nodes;
};

const getConcept = async (key: string, value: string): Promise<GraphNode[]> => {
    if (DEBUG) console.log(">>>>>>>>>>>>> LAUNCH GREMLIN METHOD", {
        method: "getConcept",
        key,
        value,
    });
    const nodes: GraphNode[] = normalizeNodes(await g.V().has(key, value).elementMap().toList());
    return nodes.filter(node => node.type === "concept");
};

interface GetConceptOfNodeOptions {
    onto?: string;
    includeOrphans?: boolean;
};

const getConceptOfNode = async (key: string, value: string, options: GetConceptOfNodeOptions = {}): Promise<GraphNode[]> => {
    if (DEBUG) console.log(">>>>>>>>>>>>> LAUNCH GREMLIN METHOD", {
        method: "getConceptOfNode",
        key,
        value,
        options,
    });
    const conceptsIds: Set<string> = new Set();
    let theNodes = normalizeNodes(await g.V().has(key, value).elementMap().toList());
    for (const concept of theNodes.filter(node => node.type === "concept")) {
        conceptsIds.add(concept.id)
    }
    if (options.onto) theNodes = theNodes.filter(node => [node.node_source_1, node.node_source_2].includes(options.onto)); // filter only nodes of selected ontology in options

    let atoms: GraphNode[] = theNodes.filter(node => node.type !== "concept");
    await doInParallel(atoms, async (atom: GraphNode) => {
        const concepts: GraphNode[] = normalizeNodes(await g.V(atom.id).out("is_atom_of").elementMap().toList());
        theNodes.push(...concepts);
        if (concepts.length === 0 && options.includeOrphans) conceptsIds.add(atom.id);
        else concepts.forEach(concept => conceptsIds.add(concept.id));
    });

    return Array.from(conceptsIds).map(nodeId => theNodes.find(node => node.id === nodeId));
};

const getEdges = async (key: string, edgeName?: string): Promise<any> => {
    return normalizeNodes(await g.V(key).outE().elementMap().toList());
};

const getEdgesBetweenNodes = async (from: string, to: string): Promise<any> => {
    if (DEBUG) console.log(">>>>>>>>>>>>> LAUNCH GREMLIN METHOD", {
        method: "getEdgesBetweenNodes",
        from,
        to,
    });
    return normalizeNodes(await g.V(from).bothE().where(__.otherV().hasId(to)).elementMap().toList());
};

class NodeRow {
    private _id: string;
    private _label: string;
    private _source: string;
    private _source2: string;
    private readonly inludesType: boolean;

    code: string;
    name: string;
    type?: NodeType | null;
    uploaded: string;

    get id() { return this._id; }

    set id(value: string) {
        this._id = value.toLowerCase();
    }

    get label() { return this._label; }

    set label(value: string) {
        this._label = value.toLowerCase()?.replace(/ /g, "_");
    }

    get source() { return this._source };

    set source(value: string) {
        this._source = value.toLowerCase();
    }

    get source2() { return this._source2 };

    set source2(value: string) {
        this._source2 = value.toLowerCase();
    }

    constructor(
        inludesType: boolean = false,
    ) {
        this.inludesType = inludesType;
    };

    toArr = (): string[] => {
        const row = [
            this.id,
            this.label,
            this.code,
            this.name,
            this.source,
        ];

        if (this._source2) row.push(this._source2);
        if (this.inludesType) row.push(this.type);
        row.push(this.uploaded);

        return row;
    };

    toObj = () => {
        const row: any = {
            id: this.id,
            label: this.label,
            code: this.code,
            name: this.name,
            source: this.source,
        }
        if (this._source2) row.source2 = this._source2;
        if (this.inludesType) row.type = this.type;
        row.uploaded = this.uploaded;

        return row;
    };
};

export {
    header,

    GraphNode,
    NodeRow,

    getNode,
    getConcept,
    getConceptOfNode,
    getEdgesBetweenNodes,
}