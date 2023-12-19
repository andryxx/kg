import { bty } from "../mods/util";

const strings: OwlStrings = [
    '<owl:Class rdf:about="http://purl.obolibrary.org/obo/MAXO_0000260">',
    '<rdfs:subClassOf rdf:resource="http://purl.obolibrary.org/obo/MAXO_0000058"/>',
    '<rdfs:subClassOf>',
    '<owl:Restriction>',
    '<owl:onProperty rdf:resource="http://purl.obolibrary.org/obo/MAXO_0000864"/>',
    '<owl:someValuesFrom>',
    '<owl:Class>',
    '<owl:intersectionOf rdf:parseType="Collection">',
    '<rdf:Description rdf:about="http://purl.obolibrary.org/obo/CHEBI_24431"/>',
    '<owl:Restriction>',
    '<owl:onProperty rdf:resource="http://purl.obolibrary.org/obo/RO_0000087"/>',
    '<owl:someValuesFrom rdf:resource="http://purl.obolibrary.org/obo/CHEBI_35470"/>',
    '</owl:Restriction>',
    '</owl:intersectionOf>',
    '</owl:Class>',
    '</owl:someValuesFrom>',
    '</owl:Restriction>',
    '</rdfs:subClassOf>',
    '<obo:IAO_0000115>Treatment with drugs producing both physiological and psychological effects through a variety of mechanisms involving the central nervous system.</obo:IAO_0000115>',
    '<rdfs:label>central nervous system agent therapy</rdfs:label>',
    '</owl:Class>'
];

type OwlStrings = string[];

const ignoreTagsInPath = [
    "Class",
    "intersectionOf",
    "Description",
];


interface DerNode {
    fullContent: OwlStrings;
    currLevContent: OwlStrings;
    children?: DerNode[];
    path?: string[];
};

const openTag = "<owl:Restriction>";
const closeTag = "</owl:Restriction>";

type tagType = "open" | "close" | "other";
const whichTagType = (tag: string): tagType => {
    if (tag === openTag) return "open";
    if (tag === closeTag) return "close";
    return "other";
};

const extractNodes = (rows: OwlStrings): DerNode[] => {
    const resp: DerNode[] = []

    const path: string[] = [];
    let depth = 0;
    let nodeCount = 0;
    let buff: {
        full: OwlStrings,
        curr: OwlStrings,
    } = { full: [], curr: [] };
    
    let hasChildren = false;
    for (const row of rows) {
        // console.log(depth, row.substring(0, 10), hasChildren);
        if (whichTagType(row) === "open") {
            if (depth > 0) buff.full.push(row);
            depth++;
            if (depth > 1) hasChildren = true;
            continue;
        }

        if (whichTagType(row) === "close") {
            depth--;
            if (depth > 0) buff.full.push(row);
            if (depth === 0) {
                resp[nodeCount] = {
                    fullContent: [],
                    currLevContent: [],
                    path: [],
                }
                for (const buffRow of buff.full) resp[nodeCount].fullContent.push(buffRow);
                for (const buffRow of buff.curr) resp[nodeCount].currLevContent.push(buffRow);
                if (hasChildren) resp[nodeCount].children = extractNodes(buff.full);

                for (const buffRow of buff.curr) {
                    const tag = buffRow.replace(/[<>\/]/g, "").split(" ").shift().split(":").pop();
                    if (buffRow.endsWith("/>")) {
                        // skip single-tag strings
                    } else if (ignoreTagsInPath.includes(tag)) {
                        // skip ignored useless tags
                    } else {
                        resp[nodeCount].path.push(tag);
                    }

                }

                nodeCount++;
                buff.full.length = 0;
                buff.curr.length = 0;
                hasChildren = false;
            }
            continue;
        }

        if (depth > 0) {
            buff.full.push(row);
        }
        if (depth === 1) {
            buff.curr.push(row);
        }
    }
    return resp;
};

const extracted = extractNodes(strings);

console.log(bty({extracted}));