
import { bty, doInParallel } from "./mods/util";
const { Client } = require("@opensearch-project/opensearch");

const client = new Client({
    node: "https://vpc-test-opensearch-ekxn6ht3mytzedcuo44g2yzm4y.us-east-1.es.amazonaws.com",
});

const index_name = "amazon_neptune";

type EntityType = "vertex" | "edge";
type NodeIfc = {
    id: string;
    label: string;
    node_source_1: string;
    node_source_2?: string;
    uploaded_at: Date;
    node_code: string;
    node_name: string;
    node_tty?: string;
    type?: string;
    node_tty_text?: string;
};

interface OpenSearchDoc {
    entity_id: string;
    document_type: EntityType;
    entity_type: string[];
    predicates: any;
};

const normalizeDoc = (doc: OpenSearchDoc): NodeIfc => {
    const { predicates } = doc;
    const resp: any = Object.entries(doc.predicates).reduce((accum, item) => {
        const [key, val] = item;
        const value = val?.[0]?.datatype === "Date" ? new Date(val?.[0]?.value) : val?.[0]?.value;
        return { ...accum, [key]: value };

    }, {});

    resp.id = doc.entity_id;
    resp.label = doc.entity_type.join("::");
    resp.dtype = doc.document_type;

    return resp;
};

const getAllMatched = async (value: string) => {
    const maxPages = 100;
    const frame = 100;
    let from = 0;

    let result = [];
    let frameResult = [];

    do {
        if (from > maxPages * frame) throw new Error(`Search limit has been exceeded: ${maxPages * frame} resulst found`);
        const response = await client.search({
            index: index_name,
            q: value,
            size: frame,
            from
        });

        frameResult = response.body.hits?.hits?.map(({ _source }) => normalizeDoc(_source));

        from += frame;
        result = [...result, ...frameResult];
    } while (frameResult.length === frame)

    return result;
}

const getAllById = async (id: string) => {
    const maxPages = 100;
    const frame = 100;
    let from = 0;

    let result = [];
    let frameResult = [];

    do {
        if (from > maxPages * frame) throw new Error(`Search limit has been exceeded: ${maxPages * frame} resulst found`);
        const response = await client.search({
            index: index_name,
            body: {
                query: {
                    match: { "entity_id": id }
                }
            },
            size: frame,
            from
        });

        frameResult = response.body.hits?.hits?.map(({ _source }) => normalizeDoc(_source));

        from += frame;
        result = [...result, ...frameResult];
    } while (frameResult.length === frame)

    return result;
}

const getItemById = async (itemId: string): Promise<any[]> => {
    const matched = await getAllById(itemId);
    const [resp] = (matched.filter(item => item.id === itemId).map(item => {
        const { dtype, ...result } = item;
        return result;
    }));
    return resp;
};

interface getEdgesParameters {
    from?: string | undefined;
    to?: string | undefined;
    some?: string | undefined;
    edgeLabel?: string;
};
const getEdges = async (params: getEdgesParameters): Promise<any[]> => {
    const { from, to, some, edgeLabel } = params;
    const allMatchedById = {};
    for (const id of [from, to, some]) {
        if (!id) continue;
        const matched = await getAllById(id);
        for (const foundObj of matched) {
            allMatchedById[foundObj.id] = foundObj;
        }
    }

    let resp: any[] = Object.values(allMatchedById);
    resp = resp.filter(item => item.dtype === "edge");

    const filters = [];
    if (from) filters.push((resp) => resp.filter(item => item.id.toString().startsWith(from)));
    if (to) filters.push((resp) => resp.filter(item => item.id.toString().endsWith(to)));
    if (some) filters.push((resp) =>
        resp.filter(item =>
            item.id.toString().startsWith(some) ||
            item.id.toString().endsWith(some)
        )
    );
    if (edgeLabel) filters.push((resp) => resp.filter(item => item.label === edgeLabel));

    for (const filter of filters) {
        resp = filter(resp);
    }

    resp = resp.map(item => {
        const [from, , to] = item.id.split("-");
        const { dtype, ...result } = item;
        return { from, to, ...result };
    });

    return resp;
};

const searchExact = async (field: string, value: string): Promise<NodeIfc[]> => {
    const results: NodeIfc[] = await getAllMatched(value);
    return results.filter(item => item[field] === value);
};

type searchableFields =
    "id" |
    "node_code";

const getConceptsOfNode = async (field: searchableFields, value: string): Promise<any[]> => {
    let matchedNodes = [];
    if (field === "node_code") matchedNodes = await searchExact(field, value);
    else if (field === "id") {
        const found = await getItemById(value);
        matchedNodes = found ? [found] : [];
    };

    const result = [];
    for (const atom of matchedNodes) {
        const edges = await getEdges({ from: atom.id, edgeLabel: "is_atom_of" }) || [];
        const concepts = await doInParallel(edges, async (edge) => {
            return await getItemById(edge.to);
        });
        result.push(...concepts);
    }
    return result;
};



(async () => {
    console.log("Search results:");

    // const field = "node_code";
    // const value = "D065635";
    // const field = "node_name";
    // const value = "Benign Paroxysmal Positional Vertigo";
    // const value = "coronavirus";
    const field = "entity_id";
    const value = "umls_A27187826";

    // const response = await searchExact(field, value);
    // const response = await getAllMatched(field, value);
    // const response = await getAllById(value);
    // const response = await getEdges({ from: value, edgeLabel: "is_atom_of" });
    const response = await getConceptsOfNode("id", value);

    // const response = await client.indices.
    // const results = response.body.hits?.hits?.map(({ _source }) => normalizeDoc(_source));
    // response.body.hits?.hits.map(item => item._source)
    // console.log(results, results.length, results.map(doc => doc.id));
    console.log(response.length, bty(response));
    // console.log(response.length, response.map(doc => doc.id));
    // console.log(response.body.hits.hits);

})();
