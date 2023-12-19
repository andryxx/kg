import fs from "fs";

// import {
//     header,
//     GraphNode,
//     NodeRow,
// } from "../mods/common";

import { Counter, bty, parseCSV, timeout } from "../mods/util";
import { Logger } from "../mods/logger";
import { allowedNodeEnvironmentFlags } from "process";


// const reader = fs.createReadStream("./mondo/data/mondo.tiny.owl");
// const reader = fs.createReadStream("./mondo/data/mondo.owl");
const reader = fs.createReadStream("./mondo/data/mondo.single.chapter.owl");

const nodesFile = "./mondo/output/nodes.list.csv";
// const debugFile = "./mondo/output/debug.log";

// const debugLog = new Logger(debugFile);

// const loggerOptions: any = {
//     withQuotes: "IfNeeded", separator: ",", header: [
//         "Node Id",
//         "Label",
//         "Definition",
//     ]
// };
// const nodesCsv = new Logger(nodesFile, loggerOptions);




const getTagValue = (tagName: string, section: string[]): string => {
    // const openPattern = new RegExp(`<${tagName}>`, "g");
    // console.log({ tagName, section })
    const row = section.find(row => row.includes(tagName));
    if (!row) return;

    if (row.endsWith("/>")) {
        return row
            ?.split(/\"/)
            ?.reverse()
            ?.[1];
    } else {
        const closePattern = new RegExp(`</${tagName}>`, "g");
        return row
            ?.replace(closePattern, "")
            ?.split(">")
            ?.pop();
    }
};

const isOntoId = (str: string): boolean => {
    const elements = str?.split("/") || [];
    const last = elements.pop();
    const prelast = elements.pop();

    return (last.includes("_") && prelast === "obo" && !last.includes("#"));
};

const owlPatterns = {
    definition: "obo:IAO_0000115",
    deprecated: "deprecated",
    hasSelf: "owl:hasSelf",
    label: "rdfs:label",
    property: "owl:onProperty",
    someValuesFrom: "owl:someValuesFrom",
};

type OwlStrings = string[];

type Chapter = {  // OWL section - equivalent of the node with all properties and outgoing edges
    nodeId?: string;
    label?: string;
    definition?: string;
    head?: OwlStrings;
    sections?: OwlStrings[];
};

type MondoReference = {
    refTypeId: string;
    refLabel: string;
    targetId: string;
    targetLabel: string;
};

const ignoreTagsInPath = [
    "Class",
    "intersectionOf",
    "Description",
];

type ResponseGetRestrictions = {
    strings: OwlStrings;
    tagsPath: string[];
    and?: string[];
};
interface Restriction {
    refTypeId: string;
    refLabel: string;
    targetId: string;
    targetLabel: string;
    tagsPath?: string[];
    relSubType?: string;
    and?: string[];
};

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
    }
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

const getRestrictions = (section: OwlStrings): Restriction[] => {
    const restrictions: Restriction[] = [];
    const restSections: ResponseGetRestrictions[] = [];

    const nodes = extractNodes(section);

    const tagsPath: string[] = [];
    let strGroupNum = 0;
    let resrtrLevel = 0;
    let strNum = 0;
    let skipLevel = false;

    for (const str of section) {

        console.log({ resrtrLevel, str })
        if (str.includes("/owl:Restriction")) {
            for (const tag of tagsPath) {
                restSections[strGroupNum].tagsPath.push(tag);
            }
            tagsPath.length = 0;
            resrtrLevel--;
            strGroupNum++;
            skipLevel = false;
        } else if (str.includes("owl:Restriction")) {
            resrtrLevel++;
        } else if (resrtrLevel === 1) {
            if (!restSections[strGroupNum]) restSections[strGroupNum] = { strings: [], tagsPath: [] }
            restSections[strGroupNum].strings.push(str);
        } else if (resrtrLevel === 2 && !skipLevel) {
            if (!restSections[strGroupNum].and) restSections[strGroupNum].and = [];
            const subsection: OwlStrings = [];
            for (let i = strNum; i < section.length; i++) {
                if (section[i].includes("/owl:Restriction")) break;
                subsection.push(section[i]);
            }
            skipLevel = true;
            const subRestrictions = getRestrictions(subsection);
            for (const subRestriction of subRestrictions) {
                const {
                    refTypeId,
                    refLabel,
                    targetId,
                    targetLabel,
                    tagsPath,
                    relSubType,
                    // and,
                } = subRestriction;

                restSections[strGroupNum].and.push([
                    tagsPath.join("-"),
                    refLabel,
                    relSubType,
                    `${targetId}(${targetLabel})`
                ].join("\\"));

                console.log(">>>>>>>>>>>", restSections[strGroupNum].and);
            }

        } else if (resrtrLevel > 2) {
            return []; // 

        } else {
            const tag = str.replace(/[<>\/]/g, "").split(" ").shift().split(":").pop();
            // construct tagsPath
            if (str.endsWith("/>")) {
                // skip single-tag strings
            } else if (str.startsWith("</") && tagsPath.length) {
                if (!ignoredTags.includes(tag)) tagsPath.pop();
            } else {
                if (!ignoredTags.includes(tag)) tagsPath.push(tag);
            }
        }
        strNum++;
    }

    for (const respSection of restSections) {
        let refSection = respSection.strings;
        const { tagsPath, and } = respSection;
        let relSubType = "";

        if (refSection.some(str => str.includes(owlPatterns.hasSelf))) refSection = replaceSelfString(refSection);
        if (refSection.some(str => Object.keys(abnormValuesTags).some(tag => str.includes(tag)))) {
            const normalized = normRestrinction(refSection);
            refSection = normalized.strings;
            relSubType = normalized.relSubType;
        }

        if (refSection.length !== 2) {
            console.log(">======== chapter.head ========<");
            console.log(chapter.head);
            console.log(">======== refSection ========<");
            console.log(refSection);
            console.log(">======== chapter ========<");
            console.log(bty({ chapter: chapter.nodeId }));
        }

        const refTypeId = getTagValue(owlPatterns.property, refSection)?.split("/")?.pop();
        let refLabel: string;
        if (refTypeId.includes("#")) refLabel = refTypeId.split("#").pop();
        else refLabel = definitions.get(refTypeId);

        const targetId = getTagValue(owlPatterns.someValuesFrom, refSection)?.split("/")?.pop();
        const targetLabel = definitions.get(targetId);

        const restriction: Restriction = {
            refTypeId,
            refLabel,
            targetId,
            targetLabel,
            //     and?: string[];
        }
        if (tagsPath) restriction.tagsPath = tagsPath;
        if (relSubType) restriction.relSubType = relSubType;
        if (and) restriction.and = and;

        //             if (Object.values(restriction).includes(undefined)) {


        restrictions.push(restriction);
    }

    return restrictions;
};

/**
 * Edges that link to themselves - have to be normalized for the proper handling
 * e.g.
 *          <owl:Restriction>
 *              <owl:onProperty rdf:resource="http://purl.obolibrary.org/obo/RO_0002481"/>
 *              <owl:hasSelf rdf:datatype="http://www.w3.org/2001/XMLSchema#boolean">true</owl:hasSelf>
 *          </owl:Restriction>
 * 
 */
const replaceSelfString = (restrictionSection: OwlStrings): OwlStrings => {
    const resp = restrictionSection.filter(string => !string.includes(owlPatterns.hasSelf));
    const propString = resp.find(string => string.includes(owlPatterns.property));
    resp.push(propString.replace(new RegExp(owlPatterns.property, "g"), owlPatterns.someValuesFrom));
    return resp;
};

const abnormValuesTags = {
    allValuesFrom: "allValuesFrom",
    someValuesFrom: "someValuesFrom",
};
interface ResponseNormRestrinction {
    strings: OwlStrings,
    relSubType: string;
};
const normRestrinction = (restrictionSection: OwlStrings): ResponseNormRestrinction => {
    const strings = restrictionSection.filter(string => string.includes(owlPatterns.property));
    const propString = restrictionSection.find(str => Object.keys(abnormValuesTags).some(tag => {
        // console.log(">>>", {str, tag, resp: str.includes(tag)})
        return str.includes(tag);
    }));
    const abnormTag = Object.keys(abnormValuesTags).find(tag => propString.includes(tag));

    strings.push(propString.replace(new RegExp(abnormTag, "g"), owlPatterns.someValuesFrom));
    return {
        strings: strings,
        relSubType: abnormTag,
    }
};


let started = false;
let prevTails: string[] = [];
const prevTailsLen = 5;
let tail: string = "";
let chpatersCount = 0;
const definitions: Map<string, string> = new Map();
let chapter: Chapter = {};
reader.on("data", async function (chunk) {
    chapter = {};
    if (!started) {
        // await nodesCsv.clear();
        const nodesDataSet = await parseCSV(nodesFile, { separator: "," });
        nodesDataSet.forEach(dataRow => {
            const {
                "Node Id": mondoId,
                "Label": label,
            } = dataRow;
            definitions.set(mondoId, label);
            // debugLog.clear();
        })
        started = true;
    }

    const owlChapters = `${tail}${chunk.toString()}`.split("<!-- ");
    // tail = owlChapters.pop();
    prevTails.unshift(tail);
    if (prevTails.length > prevTailsLen) prevTails.pop();

    for (const owlChapter of owlChapters) {
        chpatersCount++;

        const strings = owlChapter
            .split("\n")
            .map(string => string.trim())
            .filter(string => string !== "");
        if (!isOntoId(strings[0])) continue;

        chapter.nodeId = strings.shift().replace(/ -->/g, "").split("/").pop();
        if (chapter.nodeId === "HP_0000118") continue;

        if (strings.length) chapter.sections = [];
        let sectionNum = 0;
        let depth = 0;
        for (const string of strings) {
            if (string.startsWith("<owl:") && !string.endsWith("/>")) depth++;
            if (string.includes("</owl:")) depth--;
            if (!chapter.sections[sectionNum]) chapter.sections[sectionNum] = [];
            chapter.sections[sectionNum].push(string);
            if (depth === 0) sectionNum++;
            // console.log(string);
            // console.log({depth, sectionNum});
        }

        chapter.head = chapter.sections[0];
        if (getTagValue(owlPatterns.deprecated, chapter.head) === "true") continue;

        chapter.label = getTagValue(owlPatterns.label, chapter.head) || "n/a";
        chapter.definition = getTagValue(owlPatterns.definition, chapter.head) || "n/a";

        const restrictions = getRestrictions(chapter.head);
        console.log("restrictions", bty({ restrictions }));

        // const refSections = getRestrictions(chapter.head); // internal edges owl chapter's sections
        // const refs: MondoReference[] = [];

        // let relSubType;
        // for (let { strings: refSection, tagsPath } of refSections) {
        //     if (refSection.some(str => str.includes(owlPatterns.hasSelf))) refSection = replaceSelfString(refSection);
        //     if (refSection.some(str => Object.keys(abnormValuesTags).some(tag => str.includes(tag)))) {
        //         const normalized = normRestrinction(refSection);
        //         refSection = normalized.strings;
        //         relSubType = normalized.relSubType;
        //     }

        //     if (refSection.length !== 2) {
        //         console.log(">======== chapter.head ========<");
        //         console.log(chapter.head);
        //         console.log(">======== refSection ========<");
        //         console.log(refSection);
        //         console.log(">======== chapter ========<");
        //         console.log(bty({ chapter: chapter.nodeId }));
        //         // console.log(">======== tail ========<");
        //         // console.log(tail);
        //         // console.log(">======== prev tails ========<");
        //         // console.log(prevTails);
        //         // console.log(">======== owlChapters ========<");
        //         // let i = 0;
        //         // for (const owlstring of owlChapters) {
        //         //     if (i++ > 3) break;
        //         //     console.log(i, owlstring);
        //         // }
        //         // console.log(">======== SOURCE ========<");
        //         // console.log(`${tail}${chunk.toString()}`.substring(0, 500));
        //         // console.log(">======== CHUNK ========<");
        //         // console.log(chunk.toString().substring(0, 500));


        //         throw new Error("The Restriction section has unexpected amount of strings");
        //     }
        //     const refTypeId = getTagValue(owlPatterns.property, refSection)?.split("/")?.pop();

        //     let refLabel: string;
        //     if (refTypeId.includes("#")) refLabel = refTypeId.split("#").pop();
        //     else refLabel = definitions.get(refTypeId);

        //     const targetId = getTagValue(owlPatterns.someValuesFrom, refSection)?.split("/")?.pop();
        //     const targetLabel = definitions.get(targetId);

        //     const ref: MondoReference = { refTypeId, refLabel, targetId, targetLabel };
        //     refs.push(ref);
        //     if (Object.values(ref).includes(undefined)) {
        //         // console.log(">======== refSection ========<");
        //         // console.log(refSection);
        //         // console.log(">======== chapter ========<");
        //         // console.log(bty({chapter}));
        //         // console.log(">======== tail ========<");
        //         // console.log(tail);
        //         // console.log(">======== prev tails ========<");
        //         // console.log(prevTails);
        //         console.log(">======== values ========<");
        //         console.log(bty({ refTypeId, refLabel, targetId, targetLabel, chapter: chapter.nodeId, tagsPath, relSubType }));
        //         throw new Error("The Restriction section parsing failed");
        //     }
        // }

        // if (chapter.nodeId === "UBERON_0000982") console.log(refs);


        // try {
        //     const oboIdTag = getTagValue("oboInOwl:id", sections[0]);
        //     const oboId = oboIdTag?.includes(":") ? oboIdTag.split(":") : strings[0].split("/").pop().replace(/[" >]/g, "").split("_");
        //     nRow.source = "mondo";
        //     [nRow.source2, nRow.code] = oboId;
        // } catch (e) {
        //     console.log({ sections });
        //     console.log("NO oboInOwl:id FOUND");  // id tg not found in the OWL chapter
        //     process.exit(0)
        // }

        // await nodesCsv.write([
        //     chapter.nodeId,
        //     chapter.label,
        //     chapter.definition,
        // ]);

        // console.log({ nodeRow: nRow.toObj(), nodes: nodes.length });
        // console.log(chapter);
        // process.exit(0);
        tail = owlChapters.pop();
    }
}); 
