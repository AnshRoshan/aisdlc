// A clipboard rejection is not a successful copy. Keep feedback accessible and honest.
export function bindCopyButtons(root, clipboard = globalThis.navigator?.clipboard, schedule = setTimeout) {
  root.querySelectorAll("button[data-copy]").forEach((button) => {
    button.setAttribute("aria-live", "polite");
    button.addEventListener("click", async () => {
      const text = button.closest(".cmdline")?.querySelector("code")?.textContent?.trim();
      if (!text || button.disabled) return;
      button.disabled = true;
      try {
        if (!clipboard) throw new Error("Clipboard unavailable");
        await clipboard.writeText(text);
        button.textContent = "copied";
      } catch {
        button.textContent = "copy failed";
      } finally {
        button.disabled = false;
        schedule(() => { button.textContent = "copy"; }, 1400);
      }
    });
  });
}
