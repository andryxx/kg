import { doInParallel } from "./util";

const DEBUG = true;

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
}