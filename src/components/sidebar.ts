import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { base } from "../theme";
import { icon } from "../icons";
import type { NavItem } from "../types";

/**
 * The persistent left rail. It never unmounts — that is the whole reason the
 * app lives in a single Lovelace view instead of one view per page.
 */
@customElement("kt-sidebar")
export class KtSidebar extends LitElement {
  @property({ attribute: false }) items: NavItem[] = [];
  @property({ attribute: false }) settingsItem?: NavItem;
  @property() activePage = "";
  /** Pages without an implementation yet render as dimmed and inert. */
  @property({ attribute: false }) availablePages: string[] = [];

  static styles = [
    base,
    css`
      nav {
        flex: 0 0 96px;
        width: 96px;
        height: 100%;
        background: var(--surface);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 28px 0 24px;
      }

      .items {
        display: flex;
        flex-direction: column;
        /* 2px between 64px tap boxes leaves the 10px the design draws
           between the 56px visuals inside them. */
        gap: 2px;
        align-items: center;
      }

      .spacer {
        flex: 1;
      }

      .divider {
        width: 28px;
        height: 1px;
        background: var(--border);
        margin-bottom: 14px;
      }

      /* The button is the tap target, the span inside it is what you see.
         The canvas is scaled to 75% on the tablet, so a 64px box lands on
         Android's 48dp minimum while the visual keeps the design's 56px. */
      .item {
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
      }

      .visual {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 160ms ease, color 160ms ease;
      }

      .item[data-active] .visual {
        background: var(--accent-amber-soft);
        color: var(--accent-amber);
      }

      .item[data-disabled] {
        opacity: 0.35;
        cursor: default;
      }

      .settings .visual {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        opacity: 0.7;
      }

      .settings[data-active] .visual {
        background: var(--surface-2);
        color: var(--text);
        opacity: 1;
      }
    `,
  ];

  private select(item: NavItem, enabled: boolean) {
    if (!enabled) return;
    this.dispatchEvent(
      new CustomEvent("navigate", { detail: item.page, bubbles: true, composed: true })
    );
  }

  private renderItem(item: NavItem, extraClass = "", size = 24) {
    const active = item.page === this.activePage;
    const enabled = this.availablePages.includes(item.page);

    return html`
      <button
        class="item ${extraClass}"
        ?data-active=${active}
        ?data-disabled=${!enabled}
        aria-label=${item.label}
        aria-current=${active ? "page" : nothing}
        aria-disabled=${enabled ? nothing : "true"}
        @click=${() => this.select(item, enabled)}
      >
        <span class="visual">
          ${icon(item.icon, size, extraClass === "settings" ? 1.7 : 1.8)}
        </span>
      </button>
    `;
  }

  render() {
    return html`
      <nav>
        <div class="items">${this.items.map((item) => this.renderItem(item))}</div>
        <div class="spacer"></div>
        <div class="divider"></div>
        ${this.settingsItem ? this.renderItem(this.settingsItem, "settings", 19) : nothing}
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-sidebar": KtSidebar;
  }
}
