import { transit } from "./protos/proto";
import * as L from "leaflet";
import { app, map } from "./index";
import { Graphics } from "pixi.js";

import IShapePosition = transit.IShapePosition;

const { BusInfo } = transit;

function add(a, b) {
    return L.latLng(a.lat + b.lat, a.lng + b.lng);
}

function subtract(a, b) {
    return L.latLng(a.lat - b.lat, a.lng - b.lng);
}

function mult(a, b) {
    return L.latLng(a.lat * b, a.lng * b);
}

function draw_pt(p: L.Point | L.LatLng, col = 0) {
    const graph = new Graphics();
    if (p instanceof L.LatLng) {
        p = map.latLngToContainerPoint(p);
    }
    graph.beginFill(col).drawCircle(p.x, p.y, 2);
    app.stage.addChild(graph);
}

function len(p: L.LatLng) {
    return Math.sqrt(p.lat ** 2 + p.lng ** 2);
}

function dot(p: L.LatLng, v: L.LatLng) {
    return (p.lat * v.lat + p.lng * v.lng) / len(p) / len(v);
}

export var g_theirs = new Graphics().beginFill(0x229911).drawCircle(0, 0, 3);
export var g_ours = new Graphics().beginFill(0x229911).drawCircle(0, 0, 3);
g_theirs.zIndex = 10000;
g_ours.zIndex = 10000;

function draw_debug(obj: Graphics, pos: L.LatLng) {
    const pos1 = map.latLngToContainerPoint(pos);
    obj.position.set(pos1.x, pos1.y);
}

class LinearSegment {
    readonly p0: L.LatLng;
    readonly start_t: number;
    next?: LinearSegment;
    prev?: LinearSegment;
    is_sharp_edge: boolean = false;

    constructor(cur: IShapePosition, next?: LinearSegment) {
        this.p0 = L.latLng(cur.lat, cur.lon);
        this.start_t = cur.shapeDistTraveled;
        if (next != undefined) {
            this.next = next;

            if (this.next.next != undefined) {
                const our_vec = subtract(this.p1(), this.p0);
                const their_vec = subtract(this.next.p1(), this.next.p0);
                if (dot(our_vec, their_vec) < 0.3) {
                    this.is_sharp_edge = true;
                }
            }
        }
    }

    p1() {
        return this.next.p0;
    }

    end_t() {
        return this.next.start_t;
    }

    interpolate_scaledk(t: number): L.LatLng {
        return add(this.p0, mult(subtract(this.p1(), this.p0), t));
    }

    interpolate(t: number): [L.LatLng, LinearSegment] {
        if (this.next == undefined) {
            return [this.p0, this];
        }
        let scale = 0.7;
        let tscaled = (t - this.start_t) / (this.end_t() - this.start_t);
        if (tscaled > 1) {
            return this.next.interpolate(t);
        }
        if (t < this.start_t) {
            console.log("Waiting...");
            return [this.p0, this];
        }

        let ours = this.interpolate_scaledk(tscaled);
        if (tscaled <= 1 - scale && this.prev != undefined) {
            const t_new = 0.5 + tscaled / (1 - scale) / 2;
            ours = this.interpolate_scaledk((1 - scale) / 2 + tscaled / 2);
            const theirs = this.prev.interpolate_scaledk(
                (1 + scale) / 2 + tscaled / 2
            );

            const pos = add(mult(theirs, 1 - t_new), mult(ours, t_new));

            return [pos, this];
        }
        if (tscaled >= scale && this.next != undefined && this.is_sharp_edge) {
            const theirs = this.next.interpolate_scaledk((tscaled - scale) / 2);
            ours = this.interpolate_scaledk(scale + (tscaled - scale) / 2);
            const new_t1 = (tscaled - scale) / (1 - scale) / 2;
            const pos = add(mult(ours, 1 - new_t1), mult(theirs, new_t1));
            if (this.next.prev == undefined) {
                this.next.prev = this;
            }
            return [pos, this];
        }
        return [ours, this];
    }
}

function last(arr) {
    if (arr == undefined) {
        debugger;
    }
    return arr[arr.length - 1];
}

export class Segments {
    next: LinearSegment;

    constructor(shapes: IShapePosition[]) {
        this.next = new LinearSegment(last(shapes), undefined);
        // console.assert(last(this.lines).start_t != 0);
        for (let i = shapes.length - 2; i >= 0; i--) {
            if (shapes[i].shapeDistTraveled == 0 && i != 0) {
                continue;
            }
            this.next = new LinearSegment(shapes[i], this.next);
        }
    }

    interpolate(t: number): L.LatLng {
        const [position, next] = this.next.interpolate(t);
        this.next = next;
        return position;
    }
}
