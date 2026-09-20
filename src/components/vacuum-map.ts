import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { base } from "../theme";
import type { HassEntity, HomeAssistant } from "../types";

interface CalibrationPoint {
  vacuum: { x: number; y: number };
  map: { x: number; y: number };
}

export interface MapRoom {
  id: number;
  name: string;
  /** Centre of the room, already converted to map-image pixels. */
  mapX: number;
  mapY: number;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Converts vacuum coordinates to pixels in the map image.
 *
 * Built from the three calibration points the camera publishes. Solving it as
 * a general affine transform rather than a plain scale costs a few lines and
 * keeps working if the integration ever starts rotating the map.
 */
function makeTransform(points: CalibrationPoint[] | undefined) {
  if (!points || points.length < 3) return undefined;

  const [p0, p1, p2] = points;
  const dx1 = p1.vacuum.x - p0.vacuum.x;
  const dy2 = p2.vacuum.y - p0.vacuum.y;
  if (!dx1 || !dy2) return undefined;

  const ax = (p1.map.x - p0.map.x) / dx1;
  const ay = (p1.map.y - p0.map.y) / dx1;
  const bx = (p2.map.x - p0.map.x) / dy2;
  const by = (p2.map.y - p0.map.y) / dy2;

  return (v: Point): Point => ({
    x: p0.map.x + ax * (v.x - p0.vacuum.x) + bx * (v.y - p0.vacuum.y),
    y: p0.map.y + ay * (v.x - p0.vacuum.x) + by * (v.y - p0.vacuum.y),
  });
}

/**
 * The map image with a marker per room.
 *
 * Rooms are marked at their centre points rather than by their bounding
 * boxes: the boxes the integration publishes overlap each other — Olkkari and
 * Room 3 share a sizeable rectangle — so hit-testing them would sometimes
 * start the wrong room.
 */
@customElement("kt-vacuum-map")
export class KtVacuumMap extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property() cameraEntity!: string;
  @property({ attribute: false }) selected: number[] = [];
  /** Segment ids to leave off the map entirely. */
  @property({ attribute: false }) hiddenRooms: number[] = [];

  /** Natural pixel size of the map image, needed to place markers by percent. */
  @state() private natural = { width: 0, height: 0 };

  static styles = [
    base,
    css`
      :host {
        display: block;
        height: 100%;
      }

      .frame {
        position: relative;
        height: 100%;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* The stage carries the image's own aspect ratio and is what gets
         constrained, so the painted image always exactly fills it. Letting
         the image shrink inside a loose wrapper instead would leave the
         markers — positioned as percentages of the wrapper — adrift. */
      .stage {
        position: relative;
        max-width: 100%;
        max-height: 100%;
      }

      img {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: 14px;
      }

      .marker {
        position: absolute;
        transform: translate(-50%, -50%);
        /* 64px is 48dp once the canvas is scaled to 75% on the tablet. */
        min-width: 72px;
        height: 64px;
        padding: 0 18px;
        border-radius: 999px;
        /* Translucent while unselected so the cleaned path shows through.
           Only the background is see-through — the label stays at full
           opacity, or it would be unreadable over a busy map. */
        background: var(--surface-veil);
        border: 2px solid var(--border);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
        color: var(--text);
        font-size: 15px;
        font-weight: 600;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 160ms ease, border-color 160ms ease, color 160ms ease,
          box-shadow 160ms ease;
      }

      /* Selection is the one state that turns solid, which is what makes it
         readable at a glance across the whole map. */
      .marker[data-selected] {
        background: var(--accent-amber);
        border-color: var(--accent-amber);
        color: var(--on-amber);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      }

      .marker:active {
        transform: translate(-50%, -50%) scale(0.94);
      }

      .robot,
      .charger {
        position: absolute;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        pointer-events: none;
      }

      .robot {
        width: 18px;
        height: 18px;
        background: var(--accent-teal);
        border: 3px solid var(--surface);
        box-shadow: 0 0 0 2px var(--accent-teal);
      }

      .charger {
        width: 12px;
        height: 12px;
        background: var(--text-muted);
        border: 2px solid var(--surface);
      }

      .empty {
        color: var(--text-muted);
        font-size: 15px;
      }
    `,
  ];

  private get camera(): HassEntity | undefined {
    return this.hass?.states[this.cameraEntity];
  }

  private onLoad = (event: Event) => {
    const img = event.currentTarget as HTMLImageElement;
    this.natural = { width: img.naturalWidth, height: img.naturalHeight };
  };

  private toggle(id: number) {
    this.dispatchEvent(
      new CustomEvent("room-toggle", { detail: id, bubbles: true, composed: true })
    );
  }

  /** Rooms with their centres already in image pixels. */
  private get rooms(): MapRoom[] {
    const attrs = this.camera?.attributes;
    const raw = attrs?.rooms as Record<string, Record<string, unknown>> | undefined;
    const transform = makeTransform(attrs?.calibration_points as CalibrationPoint[]);
    if (!raw || !transform) return [];

    return Object.values(raw)
      .filter((r) => typeof r.x === "number" && typeof r.y === "number")
      .filter((r) => !this.hiddenRooms.includes(Number(r.room_id)))
      .map((r) => {
        const point = transform({ x: r.x as number, y: r.y as number });
        return {
          id: Number(r.room_id),
          name: String(r.custom_name ?? r.name ?? r.room_id),
          mapX: point.x,
          mapY: point.y,
        };
      });
  }

  private marker(point: Point, className: string) {
    const { width, height } = this.natural;
    if (!width || !height) return nothing;
    return html`
      <div
        class=${className}
        style=${`left: ${(point.x / width) * 100}%; top: ${(point.y / height) * 100}%`}
      ></div>
    `;
  }

  render() {
    const camera = this.camera;
    const picture = camera?.attributes.entity_picture as string | undefined;

    if (!picture) {
      return html`<div class="frame"><div class="empty">Karttaa ei ole saatavilla</div></div>`;
    }

    const attrs = camera!.attributes;
    const transform = makeTransform(attrs.calibration_points as CalibrationPoint[]);
    const robot = attrs.vacuum_position as Point | undefined;
    const charger = attrs.charger_position as Point | undefined;
    const { width, height } = this.natural;

    return html`
      <div class="frame">
        <div
          class="stage"
          style=${width && height ? `aspect-ratio: ${width} / ${height}` : ""}
        >
          <img src=${picture} alt="Imurin kartta" @load=${this.onLoad} />

          ${transform && robot ? this.marker(transform(robot), "robot") : nothing}
          ${transform && charger ? this.marker(transform(charger), "charger") : nothing}

          ${width && height
            ? this.rooms.map(
                (room) => html`
                  <button
                    class="marker"
                    ?data-selected=${this.selected.includes(room.id)}
                    aria-pressed=${this.selected.includes(room.id) ? "true" : "false"}
                    style=${`left: ${(room.mapX / width) * 100}%; top: ${(room.mapY / height) * 100}%`}
                    @click=${() => this.toggle(room.id)}
                  >
                    ${room.name}
                  </button>
                `
              )
            : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-vacuum-map": KtVacuumMap;
  }
}
