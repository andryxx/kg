import fs from "fs";
import path from "node:path";
import moment from "moment";

// import {
//     header,
//     GraphNode,
//     NodeRow,
// } from "../mods/common";

import { Counter, bty, parseCSV, timeout } from "../mods/util";
import { Logger } from "../mods/logger";


// const reader = fs.createReadStream("./mondo/data/mondo.tiny.owl");
const reader = fs.createReadStream("./mondo/data/mondo.owl");
// const reader = fs.createReadStream("./mondo/data/mondo.single.chapter.owl");

const nodesFile = "./mondo/output/nodes.list.csv";
const loggerOptions: any = {
    withQuotes: "IfNeeded", separator: ",", header: [
        "Node Id",
        "Label",
        "Definition",
    ]
};
const nodesCsv = new Logger(nodesFile, loggerOptions);

const getTagValue = (tagName: string, section: string[]): string => {
    // const openPattern = new RegExp(`<${tagName}>`, "g");
    const closePattern = new RegExp(`</${tagName}>`, "g");
    return section.find(row => row.includes(tagName))
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

const aliases = {
    label: "rdfs:label",
    definition: "obo:IAO_0000115",
};

type OwlStrings = string[];

type Chapter = {
    nodeId?: string;
    label?: string;
    definition?: string;
    head?: OwlStrings;
    sections?: OwlStrings[];
};

let started = false;
let tail: string = "";
let chpatersCount = 0;
// const loadedPreviously: Set<string> = new Set();
reader.on("data", async function (chunk) {
    if (!started) {
        await nodesCsv.clear();
        started = true;
    }

    const owlChapters = `${tail}${chunk.toString()}`.split("<!-- ");
    tail = owlChapters.pop();
    for (const owlChapter of owlChapters) {
        chpatersCount++;
        const chapter: Chapter = {};

        const strings = owlChapter
            .split("\n")
            .map(string => string.trim())
            .filter(string => string !== "");
        if (!isOntoId(strings[0])) continue;

        chapter.nodeId = strings.shift().replace(/ -->/g, "").split("/").pop();

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

        if (chapter.head.some(string => string.includes("true</owl:deprecated>"))) continue;

        chapter.label = getTagValue(aliases.label, chapter.head) || "n/a";
        chapter.definition = getTagValue(aliases.definition, chapter.head) || "n/a";

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

        await nodesCsv.write([
            chapter.nodeId,
            chapter.label,
            chapter.definition,
        ]);

        // console.log({ nodeRow: nRow.toObj(), nodes: nodes.length });
        // console.log(chapter);
        // process.exit(0);
    }
}); 
