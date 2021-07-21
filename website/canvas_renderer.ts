import * as L from "leaflet";

export interface DrawableObject {
    draw: (canvas: CanvasRenderingContext2D, map: L.Map) => void;
}

export function set_transform_from_matrix(
    canvas: CanvasRenderingContext2D,
    matrix: Array<number>
) {
    console.assert(matrix.length === 6);

    canvas.setTransform(
        matrix[0],
        matrix[3],
        matrix[1],
        matrix[4],
        matrix[2],
        matrix[5]
    );
}

export class DrawableBus implements DrawableObject {
    public readonly position: L.LatLng;
    private readonly angle: number;
    private readonly image: HTMLImageElement;

    constructor(position: L.LatLng, angle: number, image: HTMLImageElement) {
        this.position = position;
        this.angle = angle;
        this.image = image;
    }

    calculate_transform(map: L.Map): Array<number> {
        const predicted_pt = OffsetCalculator.predict_pixel_location(
            this.position,
            map
        );

        const rotation = Math.PI + this.angle;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const translation = {
            x: predicted_pt.x,
            y: predicted_pt.y,
        };

        const translate_rotation = {
            x: -this.image.width / 2,
            y: -this.image.height / 2,
        };

        // prettier-ignore
        const matrix = [
            cos, -sin, -translate_rotation.x * cos + translate_rotation.y * sin + translate_rotation.x + translation.x,
            sin, cos, -translate_rotation.x * sin - translate_rotation.y * cos + translate_rotation.y + translation.y,
        ];

        // prettier-ignore
        const matrix1 = [
            this.image.width, 0, translation.x,
            0, this.image.height, translation.y,
        ];
        return matrix1;
    }

    draw(canvas: CanvasRenderingContext2D, map: L.Map): void {
        const matrix = this.calculate_transform(map);
        set_transform_from_matrix(canvas, matrix);
        canvas.drawImage(this.image, 0, 0, 1, 1);
    }
}

export namespace OffsetCalculator {
    let canvas_outer_offset = new L.Point(0, 0);
    let canvas_inner_offset = new L.Point(0, 0);

    function duringmove(map: L.Map, canvas: HTMLCanvasElement) {
        canvas_outer_offset = map
            .getPixelOrigin()
            .subtract(map.getPixelBounds().min)
            .subtract(canvas_inner_offset);
        canvas.style.transform = `translate(${canvas_outer_offset.x}px, ${canvas_outer_offset.y}px`;
    }

    function aftermove(canvas_ctx: CanvasRenderingContext2D) {
        canvas_ctx.resetTransform();
        canvas_ctx.clearRect(
            0,
            0,
            canvas_ctx.canvas.width,
            canvas_ctx.canvas.height
        );
        canvas_inner_offset = canvas_inner_offset.add(canvas_outer_offset);
        canvas_outer_offset = new L.Point(0, 0);
        canvas_ctx.canvas.style.transform = "";
    }

    export function register_canvas_move_handlers(
        map: L.Map,
        canvas: HTMLCanvasElement
    ) {
        const canvas_ctx = canvas.getContext("2d");
        map.on("moveend", () => {
            aftermove(canvas_ctx);
        });
        map.on("move", () => {
            duringmove(map, canvas);
        });
    }

    export function predict_pixel_location(pos: L.LatLng, map: L.Map): L.Point {
        let offset = map.latLngToLayerPoint(pos);

        // const position = offset.subtract(
        //     new L.Point(image.width / 2, image.height / 2)
        // );

        const predicted_pt = offset.add(
            L.point(canvas_inner_offset.x, canvas_inner_offset.y)
        );
        return predicted_pt;
    }

    export function check_in_view(
        map: L.Map,
        pos: L.LatLng,
        canvas_bounds: L.Bounds
    ): boolean {
        return canvas_bounds.contains(predict_pixel_location(pos, map));
    }
}

export function render_objects(
    ctx: CanvasRenderingContext2D,
    map: L.Map,
    objects: Array<DrawableObject>
) {
    objects.forEach((obj) => obj.draw(ctx, map));
}
