/**
 * Fades a panel's items in one after another.
 *
 * Run through the Web Animations API rather than CSS classes so it can be
 * replayed every time a panel comes back around, without recreating the DOM
 * just to restart an animation.
 */
export function playStagger(root: ParentNode, selector = "[data-stagger]") {
  const items = Array.from(root.querySelectorAll<HTMLElement>(selector));

  for (const [i, el] of items.entries()) {
    el.getAnimations().forEach((a) => a.cancel());
    el.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: 300,
        delay: 110 + i * 55,
        easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        // Holds the item invisible through its delay, so the sequence reads
        // as items arriving rather than everything appearing then shuffling.
        fill: "backwards",
      }
    );
  }
}
