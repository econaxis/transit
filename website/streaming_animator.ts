import { PlaybackIterator } from "./playback_machine";
import * as L from "leaflet";
import { AnimSubscriber } from "./index";
import { DrawableBus } from "./canvas_renderer";
import { CanvasInteractionHandler } from "./CanvasInteractionHandler";
import EventType = CanvasInteractionHandler.EventType;

const FRAMEINTERVAL = 1000 / 80;

// Animates one frame
export function animate(
    it: PlaybackIterator,
    draw_func: (buses: Array<DrawableBus>) => void,
    check_in_viewport: (pos: L.LatLng) => boolean,
    subscribers: Array<AnimSubscriber> = [],
    interact: CanvasInteractionHandler,
    map: L.Map,
    last_run_time = 0,
    created_new = false
) {
    if (!it.check_valid()) {
        return;
    }

    if (Date.now() - last_run_time >= FRAMEINTERVAL) {
        interact.clear();

        const drawable = it.next(check_in_viewport);
        const buses = [],
            headsigns = [];
        drawable.forEach((elem) => {
            buses.push(elem[0]);
            headsigns.push(elem[1]);
            interact.register_interaction(
                EventType.HoverIn,
                elem[0].calculate_transform(map),
                () => {
                    console.log("touched bus!", elem[0].position);
                }
            );
        });

        draw_func(buses);
        last_run_time = Date.now();
        subscribers = subscribers.filter((subscr) => {
            return subscr(it, buses, it.cur_time) !== true;
        });
    }

    window.requestAnimationFrame(() => {
        animate(
            it,
            draw_func,
            check_in_viewport,
            subscribers,
            interact,
            map,
            last_run_time,
            created_new
        );
    });
}
