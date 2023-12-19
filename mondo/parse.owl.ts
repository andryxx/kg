import fs from "fs";
import path from "node:path";
import moment from "moment";

import {
    header,
    GraphNode,
    NodeRow,
} from "../mods/common";

import { getConceptsOfNode, getEdgesBetweenNodes } from "../mods/open.search";
import { Counter, bty, parseCSV, timeout } from "../mods/util";
import { Logger } from "../mods/logger";

const letsBegin = true;

const reader = fs.createReadStream("./mondo/data/mondo.tiny.owl");
// const reader = fs.createReadStream("./mondo/data/mondo.owl");

const nHeader = header.nodes;
// const eHeader = header.edges;

const nodesFile = "./mondo/output/nodes.mondo.csv";
const loggerOptions: any = { withQuotes: "IfNeeded", separator: "," };
if (letsBegin) loggerOptions.header = [...nHeader, "nodes same code"];
const nodesCsv = new Logger(nodesFile, loggerOptions);

const eMatchesFile = "./mondo/output/exact.matches.csv";
if (letsBegin) loggerOptions.header = [
    "MONDO Node",
    "MONDO Node Name",
    "Matched Concept1",
    "Concept1 Name",
    "Matched Concept2",
    "Concept2 Name",
    "Edge",
    "Reverse Edge"
];
const eMatchesCsv = new Logger(eMatchesFile, loggerOptions);

const refStatsFile = "./mondo/output/references.statistics.csv";
if (letsBegin) loggerOptions.header = [
    "MONDO Node",
    "Node Name",
    "EM Nodes",
    "EM Nodes #",
    "EM Refs",
    "EM Refs #",
    "EM Refs Missed #",
];
const refStatsCsv = new Logger(refStatsFile, loggerOptions);

const notFoundEnities = "./mondo/output/not.found.entities.csv";
const notFoundCsv = new Logger(notFoundEnities, { withQuotes: "IfNeeded", separator: "," });

const getTagValue = (tagName: string, subsection: string[]): string => {
    // const openPattern = new RegExp(`<${tagName}>`, "g");
    const closePattern = new RegExp(`</${tagName}>`, "g");
    return subsection.find(row => row.includes(tagName))
        ?.replace(closePattern, "")
        ?.split(">")
        ?.pop();
};

const isOntoId = (str: string): boolean => {
    const elements = str?.split("/") || [];
    const last = elements.pop();
    const prelast = elements.pop();

    return (last.includes("_") && prelast === "obo" && !last.includes("#"));
};

const ontolinks = {
    "http://purl.obolibrary.org/obo/DOID_": "doid",
    "https://icd.who.int/browse10/2019/en#/": "icd10",
    "http://purl.bioontology.org/ontology/ICD10CM/": "icd10cm",
    "http://identifiers.org/insdc/": "insdc", // International Nucleotide Sequence Database Collaboration
    "http://identifiers.org/meddra/": "meddra",
    "http://identifiers.org/mesh/": "msh", // C536474
    "http://purl.obolibrary.org/obo/NCIT_": "ncit",
    "https://omim.org/phenotypicSeries/": "omim",
    "https://omim.org/entry/": "omim",
    "http://www.orpha.net/ORDO/": "orphanet",
    "http://identifiers.org/refseq/": "refseq", // unknown
    "http://identifiers.org/snomedct/": "snomedct_us",
    "http://linkedlifedata.com/resource/umls/id/": "umls",
};

class Node {
    private readonly _link: string;
    private readonly _nCode: string;
    private readonly _onto: string;

    constructor(link: string) {
        this._link = link;
        this._onto = defineOnto(link);
        this._nCode = link.split("/").pop();
    }

    private async _getConceptByCode(code: string = this._nCode) {
        const concepts: GraphNode[] = await getConceptsOfNode("node_code", code, { onto: this._onto });

        if (concepts.length === 0 && ![].includes(this._onto)) {
            console.log(`=============== NOT FOUN CONCEPT: ${this._link} onto: ${this._onto} code: ${code} ===============`);
            // console.log({ concepts });
            // process.exit(0);
            await notFoundCsv.write([
                this._nCode,
                this._onto,
                this._link,
            ]);
        }

        return concepts;
    };

    private async _getConceptById(id) {
        const concepts = await getConceptsOfNode("id", id);
        // console.log({ concepts })

        if (concepts.length === 0) {
            console.log(`=============== NOT FOUN CONCEPT: ${this._link} onto: ${this._onto} nodeId: ${id} ===============`);
            await notFoundCsv.write([
                this._nCode,
                this._onto,
                this._link,
            ]);
        }

        return concepts;
    };

    async findConcepts() {
        // if (this._nCode !== "C0152101") return [];

        if (this._onto === "umls") {
            const nodeId = `${this._onto}_${this._nCode}`;
            return await this._getConceptById(nodeId);
        } else if (this._onto === "msh") {
            // const concepts: GraphNode[] = await getConceptOfNode("node_code", this._nCode, { onto: this._onto });

            // if (concepts.length === 0 ) {
            //     console.log(`===============  ${this._link} onto: ${this._onto} nCode: ${this._nCode} ===============`);
            //     console.log({ concepts });
            // }

            // if (concepts.length === 0) process.exit(0)

            return await this._getConceptByCode();
        } else if (this._onto === "insdc") {
            return [];
        } else if (this._onto === "refseq") {
            return [];
        } else if (this._onto === "snomedct_us") {
            // const concepts: GraphNode[] = await getConceptOfNode("node_code", this._nCode, { onto: this._onto });

            // if (concepts.length === 0 ) {
            //     console.log(`===============  ${this._link} onto: ${this._onto} nCode: ${this._nCode} ===============`);
            //     console.log({ concepts });
            // }

            // return concepts;
            return await this._getConceptByCode();
        } else if (this._onto === "doid") {
            // const concepts: GraphNode[] = await getConceptOfNode("~id", this._nCode.toLowerCase());

            // if (concepts.length === 0) {
            //     console.log(`===============  ${this._link} onto: ${this._onto} nCode: ${this._nCode} ===============`);
            //     console.log({ concepts });
            // }

            // return concepts;
            return await this._getConceptById(this._nCode.toLowerCase());
        } else if (this._onto === "ncit") {
            return [];
        } else if (["icd10", "icd10cm"].includes(this._onto)) {
            return await this._getConceptByCode();
        } else if (this._onto === "orphanet") {
            return await this._getConceptByCode(this._nCode.split("_").pop());
        } else if (this._onto === "omim") {
            return await this._getConceptByCode();
        } else if (this._onto === "###") {
        } else {
            console.log(`======================= ${this._link} onto: ${this._onto} nCode: ${this._nCode} ========================`);
            throw new Error(`The ontology ${this._onto} is not defined for graph nodes search`);
        }
    }
};

const oLinksList = Object.keys(ontolinks);
const oLinkExists = (link: string): boolean => {
    return oLinksList.some(olink => link.includes(olink));
};

const defineOnto = (link: string): string => ontolinks[oLinksList.find(olink => link.includes(olink))];

const getExactMatches = (section: string[]): Object => {
    const resp: Object = {};
    for (const row of section) {
        if (!row.includes("skos:exactMatch rdf:resource")) continue;
        const ontoLink = row.replace(/<skos:exactMatch rdf:resource="/g, "").replace(/"\/>/g, "");
        if (!oLinkExists(ontoLink)) throw new Error(`Ontology not configured: ${ontoLink}`);
        const onto = defineOnto(ontoLink);

        resp[onto] = ontoLink;
    }

    return resp;
};

let started = false;
let tail: string = "";
let sectionsCount = 0;
const loadedPreviously: Set<string> = new Set();
reader.on("data", async function (chunk) {
    if (!started) {
        if (letsBegin) {
            await nodesCsv.clear();
            await eMatchesCsv.clear();
            await refStatsCsv.clear();
        } else {
            const loadedDataSet = await parseCSV(nodesFile, { separator: "," });
            loadedDataSet.forEach(dataRow => {
                const { "~id": nodeId } = dataRow;
                loadedPreviously.add(nodeId);
            });
        }
        started = true;
    }

    const sections = `${tail}${chunk.toString()}`.split("<!-- http:");
    tail = sections.pop();
    for (const section of sections) {
        sectionsCount++;

        const strings = section
            .split("\n")
            .map(string => string.trim())
            .filter(string => string !== "");
        if (!isOntoId(strings[0])) continue;

        const nRow = new NodeRow();
        nRow.id = strings.shift().replace(/[-> ]/g, "").split("/").pop();
        if (loadedPreviously.has(nRow.id)) continue;

        const subsections = [];
        let sectionNum = 0;
        let depth = 0;
        for (const string of strings) {
            if (string.startsWith("<owl:") && !string.endsWith("/>")) depth++;
            if (string.startsWith("</owl:")) depth--;
            if (!subsections[sectionNum]) subsections[sectionNum] = [];
            subsections[sectionNum].push(string);
            if (depth === 0) sectionNum++;
        }

        const [head] = subsections;

        if (head.some(string => string.includes("true</owl:deprecated>"))) continue;

        nRow.name = getTagValue("rdfs:label", subsections[0]);
        if (!nRow.name) continue;
        nRow.type = null;

        try {
            const oboIdTag = getTagValue("oboInOwl:id", subsections[0]);
            const oboId = oboIdTag?.includes(":") ? oboIdTag.split(":") : strings[0].split("/").pop().replace(/[" >]/g, "").split("_");
            nRow.source = "mondo";
            [nRow.source2, nRow.code] = oboId;
        } catch (e) {
            console.log({ subsections });
            console.log("NO oboInOwl:id FOUND");
            process.exit(0)
        }
        nRow.uploaded = new Date().toISOString();


        const nodes = [];
        // const nodes = nRow.code ? (await getNode("node_code", nRow.code)) : [];

        // const nodesSameId = nRow.id ? (await getNode("~id", nRow.id)) : [];
        // const nodes = await getNode("node_code", "41910004")

        const synos = getExactMatches(head);
        const synoConcepts = {};
        const uniConcepts: Set<string> = new Set();
        const foundNodes = {};
        for (const [onto, synoLink] of Object.entries(synos)) {
            const node = new Node(synoLink);
            const concepts = await node.findConcepts();

            if (!concepts.length) continue;
            for (const concept of concepts) {
                foundNodes[concept?.id || "UNPARSED_ERROR"] = concept;
                uniConcepts.add(`${concept?.id || "UNPARSED_ERROR"} - "${concept?.node_name || "UNPARSED_ERROR"}"`);
            }
            synoConcepts[onto] = concepts.map(node => node?.id || "UNPARSED_ERROR");
            // try {
            // } catch(e) {
            //     console.log("Something goes wrong");
            //     console.log({synoLink, onto});
            //     throw e;
            // }
        }



        const crossEdges = [];
        if (uniConcepts.size > 1) {
            // console.log("+++++++++++++++++++++++++")
            const concepts = Array.from(uniConcepts).map(rec => rec.split(" - \"").shift());

            const handled: Set<string> = new Set();
            for (const nodeId1 of concepts) {
                handled.add(nodeId1);
                for (const nodeId2 of concepts) {
                    if (handled.has(nodeId2)) continue;
                    const edges = await getEdgesBetweenNodes(nodeId1, nodeId2);
                    for (const edge of edges) {
                        const [from, edgeName, to] = edge.id.split("-");
                        crossEdges.push({ key: `${from}-${to}`, edgeName });
                    };
                    if (!crossEdges.some(edge => edge.key === `${nodeId1}-${nodeId2}`)) {
                        crossEdges.push({ key: `${nodeId1}-${nodeId2}`, edgeName: "!!MISSED!!" });
                    }
                    if (!crossEdges.some(edge => edge.key === `${nodeId2}-${nodeId1}`)) {
                        crossEdges.push({ key: `${nodeId2}-${nodeId1}`, edgeName: "!!MISSED!!" });
                    }
                }
            }
        }

        // if (uniConcepts.size > 0) {

        //     console.log({
        //         mondo: nRow.id,
        //         concepts: Array.from(uniConcepts),
        //     });
        //     console.table(crossEdges)
        // };

        const subcounter = new Counter();
        const handledKeys = new Set();
        for (const xref of crossEdges) {
            const { key, edgeName } = xref;
            if (handledKeys.has(key)) continue;
            const [from, to] = key.split("-");
            const node1: GraphNode = foundNodes[from];
            const node2: GraphNode = foundNodes[to];

            const reverseKey = [to, from].join("-");
            const reverseXref = crossEdges.find(xref => xref.key === reverseKey) || { key: reverseKey, edgeName: "!!NOT FOUND!!" };
            handledKeys.add(reverseKey);

            if (!node1)

                await eMatchesCsv.write([
                    nRow.id, // "MONDO Node",
                    nRow.name, // "Node Name",
                    node1.id, // "Matched Concept1",
                    node1.node_name, // "Concept1 Name",
                    node2.id, // "Matched Concept2",
                    node2.node_name, // "Concept2 Name",
                    edgeName, // "Edge",
                    reverseXref.edgeName, // "Reverse Edge"
                ]);
            subcounter.add(edgeName);
            subcounter.add(reverseXref.edgeName);
        }

        const edgesNum = subcounter.getTotal(["!!NOT FOUND!!", "!!MISSED!!"]);
        const missedNum = subcounter.getTotal() - edgesNum;
        await refStatsCsv.write([
            nRow.id, // "MONDO Node",
            nRow.name, // "Node Name",
            Array.from(uniConcepts).join("\n"), // "EM Nodes",
            uniConcepts.size.toString(), // "EM Nodes #",
            subcounter.getAsArr().join("\n"), // "EM Refs",
            edgesNum.toString(), // "EM Refs #",
            missedNum.toString(), // "EM Refs Missed #",

        ]);

        const dataRow = nRow.toArr();
        dataRow.push(nodes.length.toString());



        // dataRow.push(nodesSameId.length.toString());
        await nodesCsv.write(dataRow);

        // console.log({ nodeRow: nRow.toObj(), nodes: nodes.length });
        // process.exit(0);
    }
}); 
