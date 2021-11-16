import {app, fix, map, set_follow, sprites} from "./index";

export namespace ZoomHandler {
    export var target_scale = 1;
    let start_scale = 1;
    let anim_progress = 0;
    let zoom_anim_scale = 1;

    let center;
    let zoom;

    export function init() {
        center = map.getCenter();
        zoom = map.getZoom();

        map.on("zoomanim", (e) => {
            zoom = map.getZoom();
            center = map.getCenter();
            const zoom1 = e.zoom;
            const center1 = e.center;
            zoom_anim_scale = map.getZoomScale(zoom1, zoom);
            // This part derived, with modifications, from https://github.com/manubb/Leaflet.PixiOverlay/blob/master/L.PixiOverlay.js#L206
            const currentCenterPoint = map
                .project(center, zoom1)
                // @ts-ignore
                .subtract(map._getNewPixelOrigin(center1, zoom1));
            const translate_offset = map
                .getPixelBounds()
                .min.subtract(map.getPixelOrigin());
            const viewhalf = map
                .getSize()
                .multiplyBy(zoom_anim_scale * -0.5)
                .add(currentCenterPoint)
                .subtract(translate_offset);

            app.view.classList.add("leaflet-zoom-animated");
            app.view.style.transform = `translate3d(${viewhalf.x}px, ${viewhalf.y}px, 0px) scale(${zoom_anim_scale}) `;
            // L.DomUtil.setTransform(app.view, viewhalf, scale);
        });
        map.on("zoomend", () => {
            app.view.classList.remove("leaflet-zoom-animated");
            for (const s of sprites) {
                s.rect.inner.scale.set(zoom_anim_scale, zoom_anim_scale);
            }
            app.render();
            app.view.style.transform = "";
            ZoomHandler.rescale(1);
        });
        map.on("move", (evt) => {
            set_follow(undefined);
            fix();
            app.render();
        });
    }

    // Copied with modifications from easings.net/#easeInOutCubic
    function ease_cubic(progress: number, start: number, end: number): number {
        const scale =
            progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        return (1 - scale) * start + scale * end;
    }

    export function rescale(scale?, immediate = false) {
        if (scale !== undefined) {
            anim_progress = 0;
            start_scale = sprites[0].rect.inner.scale.x;
            target_scale = scale;
        }
        if (anim_progress >= 1) {
            return;
        }
        anim_progress += 0.12;
        if (immediate) anim_progress = 1;
        const to_set = ease_cubic(anim_progress, start_scale, target_scale);
        for (const s of sprites) {
            s.rect.inner.scale.set(to_set, to_set);
        }
    }
}