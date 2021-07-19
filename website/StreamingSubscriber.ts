import { animate_with_default_canvas, AnimSubscriber } from "./index";
import { PlaybackIterator } from "./playback_machine";

async function new_iterator(
    oldit: PlaybackIterator
): Promise<PlaybackIterator> {
    const desired_max = Math.round(oldit.cur_time) + 60 * 10;
    const it = await PlaybackIterator.construct({
        min: Math.round(oldit.cur_time) - 60 * 10,
        max: desired_max,
    });

    it.cur_time = oldit.cur_time - 1;
    return it;
}

(window as any).s = [];
export namespace StreamingSubscriber {
    export const handler: AnimSubscriber = (iterator): boolean => {
        if (iterator.get_proportion_left() < 0.15) {
            new_iterator(iterator).then((newit) => {
                if (!iterator.check_valid()) {
                    console.warn("Old ended before we start new one");
                }

                console.log(
                    "Booting up new animator at time ",
                    new Date(iterator.cur_time * 1000).toLocaleString()
                );
                newit.cur_time = iterator.cur_time;

                (window as any).s.push({
                    new: newit.copy(),
                    old: iterator.copy(),
                });

                iterator.stop = true;
                animate_with_default_canvas(newit);
            });
            return true;
        } else {
            return false;
        }
    };
}
