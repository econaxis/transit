namespace CanvasInteractionHandler {
    type HoverMap = Map<number, Handler>;

    export enum EventType {
        HoverIn,
        HoverOut,
        Click,
    }

    export type Handler = (
        event_type: EventType,
        mouse_data: MouseEvent
    ) => void;

    let cur_number = 0;

    export function default_hovermap(): HoverMap {
        return new Map<number, Handler>();
    }

    function create_invis_canvas(
        base_canvas: HTMLCanvasElement
    ): HTMLCanvasElement {
        const canvas = new HTMLCanvasElement();
        canvas.id = "invis-canvas";
        canvas.width = base_canvas.width;
        canvas.height = base_canvas.height;
        canvas.style.zIndex = "0";
        canvas.style.position = "absolute";
        return canvas;
    }

    export function register_invis_canvas(
        base_canvas: HTMLCanvasElement,
        parent_elem: HTMLElement
    ) {
        parent_elem.appendChild(create_invis_canvas(base_canvas));
    }

    export function register_interaction(
        hovermap: HoverMap,
        canvas: CanvasRenderingContext2D,
        type: EventType,
        rect_bounds: L.Bounds,
        handler: Handler
    ) {
        if (hovermap == null) hovermap = default_hovermap();

        if (type != EventType.HoverIn) {
            throw Error("Not implemented");
        }

        cur_number++;
        hovermap.set(cur_number, handler);

        const r = cur_number & 0x0000ff;
        const g = cur_number & 0x00ff00;
        const b = cur_number & 0xff0000;
        const alpha = 0xff;

        canvas.fillRect(rect_bounds.getTopLeft().x, rect_bounds.getTopLeft().y, rect_bounds.getSize().x, rect_bounds.getSize().y);
        canvas.fillStyle = "black";
    }

    export function canvas_mouseover_handler(
        hovermap: HoverMap,
        ctx: CanvasRenderingContext2D,
        evt: MouseEvent
    ) {
        const x = evt.offsetX;
        const y = evt.offsetY;

        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data.slice(0, 3);

        const int24 = (r << (16 + g)) << (8 + b);

        hovermap.get(int24)(EventType.HoverIn, evt);
    }
}
