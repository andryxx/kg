import { bty, doInParallel } from "./mods/util";
import gremlin from "gremlin";

import { GraphNode } from "./mods/common";

const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

// const endpoint = "wss://neptune-dev-database-1.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY
// const endpoint = "wss://dev.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY
const endpoint = "wss://dev-instance-2.csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY

// const endpoint = "wss://neptune-dev-database-1.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ WRITE

const dc = new DriverRemoteConnection(endpoint, {});

const graph = new Graph();
const g = graph.traversal().withRemote(dc);

const direction = gremlin.process.direction
const __ = gremlin.process.statics;



// const id = "umls_pa166238901";
// const id = "pgkb_pa166238901";

// g.V().has("~id", id).toList().
// g.V().has("~label", "disease").count().toList().
// g.V().has("node_code", "PA166238901").toList().
// g.V('123456').values('fld_type')


const normalizeNodes = (nodesArr: any[]): GraphNode[] => nodesArr.map(item => JSON.parse(JSON.stringify(Object.fromEntries(item))));

const getNode = async (key: string, value: string): Promise<GraphNode[]> => {
    const nodes: GraphNode[] = normalizeNodes(await g.V().has(key, value).elementMap().toList());
    return nodes;
};

const getSingleNode = async (key: string, value: string): Promise<GraphNode[]> => {
    const nodes: GraphNode[] = normalizeNodes(await g.V().has(key, value).limit(1).elementMap().toList());
    return nodes;
};

const getConcept = async (key: string, value: string): Promise<GraphNode[]> => {
    const nodes: GraphNode[] = normalizeNodes(await g.V().has(key, value).elementMap().toList());
    return nodes.filter(node => node.type === "concept");
};

const getEdges = async (from: string, edgeName?: string): Promise<any> => {
    return normalizeNodes(await g.V(from).outE().elementMap().toList());
};

// const getConceptOfNode = async (key: string, value: string): Promise<GraphNode[]> => {
//     const conceptsIds: Set<string> = new Set();
//     const theNodes = normalizeNodes(await g.V().has(key, value).elementMap().toList());

//     let atoms: GraphNode[] = theNodes.filter(node => node.type !== "concept");
//     await doInParallel(atoms, async (atom: GraphNode) => {
//         const concepts: GraphNode[] = normalizeNodes(await g.V(atom.id).out("is_atom_of").elementMap().toList());
//         theNodes.push(...concepts);
//         if (concepts.length === 0) conceptsIds.add(atom.id);
//         else concepts.forEach(concept => conceptsIds.add(concept.id));
//     });

//     return Array.from(conceptsIds).map(nodeId => theNodes.find(node => node.id === nodeId));
// };

// interface GetConceptOfNodeOptions {
//     onto?: string;
// };

// const getConceptOfNode = async (key: string, value: string, options: GetConceptOfNodeOptions = {}): Promise<GraphNode[]> => {
//     const conceptsIds: Set<string> = new Set();
//     let theNodes = normalizeNodes(await g.V().has(key, value).elementMap().toList());
//     if (options.onto) theNodes = theNodes.filter(node => [node.node_source_1, node.node_source_2].includes(options.onto)); // filter only nodes of selected ontology in options

//     let atoms: GraphNode[] = theNodes.filter(node => node.type !== "concept");
//     await doInParallel(atoms, async (atom: GraphNode) => {
//         const concepts: GraphNode[] = normalizeNodes(await g.V(atom.id).out("is_atom_of").elementMap().toList());
//         theNodes.push(...concepts);
//         if (concepts.length === 0) conceptsIds.add(atom.id);
//         else concepts.forEach(concept => conceptsIds.add(concept.id));
//     });

//     return Array.from(conceptsIds).map(nodeId => theNodes.find(node => node.id === nodeId));
// };


// const customQuery = async (): Promise<GraphNode[]> => {
//     const nodes: GraphNode[] = normalizeNodes(await
//         g.V().hasId("umls_C0945357")
//             .out()
//             .repeat(__.out().simplePath())
//             // .until(__.hasId("umls_C1719336"))
//             .times(2)
//             .hasId("umls_C1719336")
//             // .until(__.hasId("umls_C0392762"))
//             .limit(1)
//             .elementMap()
//             .toList()
//     );
//     return nodes.filter(node => node.type === "concept");
// };

// const customQuery = async (): Promise<GraphNode[]> => {
//     const nodes: GraphNode[] = normalizeNodes(await
//         g.V().hasId("umls_C0945357")
//             .out()
//             .repeat(__.out().simplePath())
//             // .until(__.hasId("umls_C1719336"))
//             .times(2)
//             .hasId("umls_C1719336")
//             // .until(__.hasId("umls_C0392762"))
//             .limit(1)
//             .elementMap()
//             .toList()
//     );
//     return nodes.filter(node => node.type === "concept");
// };

const customQuery = async (): Promise<GraphNode[]> => {
    const nodes: GraphNode[] = normalizeNodes(await
        g.V().has("node_source_1", "doid")
            .limit(1)
            .elementMap()
            .toList()
    );
    return nodes;
};

const getEdgesBetweenNodes = async (from: string, to: string): Promise<any> => {
    // const nodes: GraphNode[] = normalizeNodes(await g.V(key).out().elementMap().toList());
    return normalizeNodes(await g.V(from).bothE().where(__.otherV().hasId(to)).elementMap().toList());
};



(async () => {
    console.log("GREMLIN");
    // const data = await g.V().has('node_code', searchValue).elementMap().toList();
    // const data = await g.V("umls_A18467593").outE().elementMap().toList(); // all edges
    // const data = await g.V("umls_A18467593").out("is_atom_of").elementMap().toList();
    // const resp = data.map(item => JSON.parse(JSON.stringify(Object.fromEntries(item))));

    // const resp = await customQuery();


    // const searchValue = "Currarino syndrome";
    // const field = "node_name";
    // const field = "~id";
    const field = "node_code";

    const searchValue = "2248";
    // const searchValue = "D018636";

    // const field = "node_source_1";
    // const field = "node_source_2";
    // const searchValue = "omim";

    // =============== NOT FOUN CONCEPT: http://identifiers.org/snomedct/85051008 onto: snomedct_us code: 85051008 ===============


    // const resp = await getConceptOfNode(field, searchValue);
    // const resp = await getSingleNode(field, searchValue);
    const resp = await getNode(field, searchValue);

    // const resp = await getEdges("umls_A17838111");

    // const nodeId = "umls_C0205858";
    // const resp = await getEdges(nodeId);

    // const id1 = "umls_C0205858";
    // const id2 = "dbpedia_149778";

    // const resp = await getEdgesBetweenNodes(id1, id2);

    console.log(resp.length, resp);
    // console.log(resp.length, resp.map(item => item.id).sort());
    dc.close();

})();
