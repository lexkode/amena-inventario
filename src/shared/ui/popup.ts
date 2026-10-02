type PopupState = {
  open: boolean;
  animations: Animation[];
  finished: Promise<void>;
};

const popups = new WeakMap<HTMLElement, PopupState>();

/** Animate a popup in, and play the same visual path backwards to close it. */
export function setPopupOpen(overlay: HTMLElement, open: boolean): Promise<void> {
  const previous = popups.get(overlay);
  if (previous?.open === open) return previous.finished;
  if (!previous && !open) {
    overlay.inert = true;
    return Promise.resolve();
  }

  previous?.animations.forEach((animation) => animation.cancel());

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const panel = overlay.querySelector<HTMLElement>(':scope > [role="dialog"]');
  const offset = reducedMotion ? "48px" : "100px";
  const easingIn = "cubic-bezier(0, 0, 0.2, 1)";
  const easingOut = "cubic-bezier(0.8, 0, 1, 1)";
  const entryDuration = 340;
  const state: PopupState = { open, animations: [], finished: Promise.resolve() };
  popups.set(overlay, state);

  overlay.inert = !open;
  overlay.classList.add("open");

  // Start every entry track immediately; mirror their end offsets on exit.
  state.animations.push(overlay.animate(
    open
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 1 }, { opacity: 0 }],
    {
      duration: 300,
      delay: open ? 0 : entryDuration - 300,
      easing: open ? easingIn : easingOut,
      fill: "both",
    },
  ));

  if (panel) {
    state.animations.push(panel.animate(
      open
        ? [{ translate: `0 ${offset}` }, { translate: "0 0" }]
        : [{ translate: "0 0" }, { translate: `0 ${offset}` }],
      {
        duration: entryDuration,
        delay: 0,
        easing: open ? easingIn : easingOut,
        fill: "both",
      },
    ));
  }

  state.finished = Promise.all(
    state.animations.map((animation) => animation.finished.catch(() => undefined)),
  ).then(() => {
    if (popups.get(overlay) !== state) return;
    if (!open) overlay.classList.remove("open");
    state.animations.forEach((animation) => animation.cancel());
    state.animations = [];
  });

  return state.finished;
}

/** Resolve only after removal so a following dialog does not overlap the exit. */
export async function removePopup(overlay: HTMLElement): Promise<void> {
  await setPopupOpen(overlay, false);
  overlay.remove();
  popups.delete(overlay);
}
