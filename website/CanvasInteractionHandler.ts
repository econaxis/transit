import { set_transform_from_matrix } from "./canvas_renderer";

type HoverMap = CanvasInteractionHandler.HoverMap;
type Handler = CanvasInteractionHandler.Handler;
type EventType = CanvasInteractionHandler.EventType;

function default_hovermap(): CanvasInteractionHandler.HoverMap {
    return new Map<number, CanvasInteractionHandler.Handler>();
}

function create_invis_canvas(
    base_canvas: HTMLCanvasElement
): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.id = "invis-canvas";
    canvas.width = base_canvas.width;
    canvas.height = base_canvas.height;
    canvas.style.zIndex = "100000";
    canvas.style.position = "absolute";
    return canvas;
}

export class CanvasInteractionHandler {
    cur_number = 2;
    hovermap: CanvasInteractionHandler.HoverMap = default_hovermap();
    canvas: CanvasRenderingContext2D;

    constructor(base_canvas: HTMLCanvasElement, parent_elem: HTMLElement) {
        const canvaselem = create_invis_canvas(base_canvas);

        parent_elem.appendChild(canvaselem);

        this.canvas = canvaselem.getContext("2d");
        this.register_event_listeners();
    }

    clear() {
        this.canvas.clearRect(0, 0, 10000, 10000);
    }

    register_interaction(
        type: CanvasInteractionHandler.EventType,
        transform: Array<number>,
        handler: CanvasInteractionHandler.Handler
    ) {
        if (type != CanvasInteractionHandler.EventType.HoverIn) {
            throw Error("Not implemented");
        }

        this.cur_number++;
        this.hovermap.set(this.cur_number, handler);

        const b = this.cur_number & 0x0000ff;
        const g = (this.cur_number & 0x00ff00) >> 8;
        const r = (this.cur_number & 0xff0000) >> 16;

        set_transform_from_matrix(this.canvas, transform);
        this.canvas.fillStyle = `rgb(${r}, ${g}, ${b})`;
        // console.log(this.canvas.fillStyle);
        this.canvas.fillRect(0, 0, 1, 1);


        (window as any).canvas = this.canvas;
    }

    private canvas_mouseover_handler( evt: MouseEvent) {
        const x = evt.offsetX;
        const y = evt.offsetY;

        const [r, g, b] = this.canvas.getImageData(x, y, 1, 1).data.slice(0, 3);

        const int24 = (r << 16) + (g << 8) + b;

        const res = this.hovermap.get(int24);

        if (res) res(CanvasInteractionHandler.EventType.HoverIn, evt);
        else if (int24 !== 0) console.log("Color not found", int24);
    }


    register_event_listeners() {
        this.canvas.canvas.addEventListener("mousemove", (evt) => this.canvas_mouseover_handler(evt));
    }
}

export namespace CanvasInteractionHandler {
    export type HoverMap = Map<number, Handler>;

    export enum EventType {
        HoverIn,
        HoverOut,
        Click,
    }

    export type Handler = (
        event_type: EventType,
        mouse_data: MouseEvent
    ) => void;
}

namespace test {
    export function test_handler() {
        console.log("test handler")
        const map = document.getElementById("mapid");
        const basecanvas = document.createElement("canvas");
        basecanvas.width = 500;
        basecanvas.height = 500;

        const c = new CanvasInteractionHandler(basecanvas, map);
        c.register_event_listeners();

        //prettier-ignore
        const matrix = [
            10, 0, 100,
            0, 15, 200,
        ];

        c.register_interaction(CanvasInteractionHandler.EventType.HoverIn, matrix, () => {console.log("Touched!")});
    }
}
