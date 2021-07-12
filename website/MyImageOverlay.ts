import { polyline } from "leaflet";
import * as L from "leaflet";

export class MyImageOverlay extends Image {
    public latlng: L.LatLng;
    private readonly angle: number;

    constructor(position, angle, map: L.Map) {
        super(22, 22);
        this.src = "bus.png";
        this.className = "bus-image";
        this.style.position = "absolute";
        this.angle = angle;
        this.latlng = position;

        this.update(map);
        map.on("zoom", () => {
            this.update(map);
        });

        map.getPane("overlayPane").appendChild(this);
    }

    update(map: L.Map) {
        let offset = map.latLngToLayerPoint(this.latlng);

        offset = offset.subtract(new L.Point(this.width / 2, this.height / 2));

        this.style.transform = `translate(${offset.x}px, ${offset.y}px) rotate(${this.angle}rad) rotate(180deg)`;
    }
}
