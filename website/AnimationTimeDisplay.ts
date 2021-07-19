import {AnimSubscriber} from "./index";

const timeelem = document.getElementById("time");
export const subscr: AnimSubscriber = (iterator, drawables, sim_time) => {
    const time = new Date(sim_time * 1000).toLocaleString();
    const num_vehicles = drawables.length.toString();
    const tot_vehicles = iterator.buses.length;
    const prop_left = Math.round(iterator.get_proportion_left() * 100);
    timeelem.innerHTML = `${time} ${num_vehicles}/${tot_vehicles} vehicles being rendered<br>${prop_left}%`;
}

const w = (window as any);

w.comp = (ind1, draw = w.df) => {
    console.assert(w.s[ind1].new.cur_time == w.s[ind1].old.cur_time);

    const res1 = w.s[ind1].old.next(() => true);

    const res2 = w.s[ind1].new.next(() => true);

    return {res1, res2};
}