console.time("script");
import { Logger } from "./mods/logger";
import { bty } from "./mods/util";

import mondo from "./mondo/mondo.json";

const graph: any = mondo;

const graphParts: any = graph.graphs[0];
const { nodes, edges, ...meta } = graphParts;

const nodesFile = "./mondo/nodes.json";
const nodesLogger = new Logger(nodesFile);

const edgesFile = "./mondo/edges.json";
const edgesLogger = new Logger(edgesFile);

const metaFile = "./mondo/meta.json";
const metaLogger = new Logger(metaFile);

(async () => {
    console.log("writing nodes...");
    await nodesLogger.rewrite(bty(nodes));

    console.log("writing edges...");
    await edgesLogger.rewrite(bty(edges));

    console.log("writing meta...");
    await metaLogger.rewrite(bty(meta));
})();
console.timeEnd("script");
// process.exit(0);
