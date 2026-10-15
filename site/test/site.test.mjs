import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getSkills, renderMarkdown, outline } from "../src/lib/skills.js";
import { bindCopyButtons } from "../src/lib/copy.js";

test("skill discovery works outside the site working directory", async () => {
  const cwd = process.cwd();
  try {
    process.chdir(fileURLToPath(new URL("../..", import.meta.url)));
    const { getSkills: discover } = await import("../src/lib/skills.js?outside-site");
    const skills = discover();
    assert.ok(skills.length > 0);
    assert.ok(skills.every((skill) => skill.description && skill.html));
    assert.deepEqual(skills.map((skill) => skill.name), getSkills().map((skill) => skill.name));
  } finally {
    process.chdir(cwd);
  }
});

test("rendering preserves code punctuation and escapes placeholder HTML", () => {
  const html = renderMarkdown('`a—b`\n\n<slug>\n');
  assert.match(html, /<code>a—b<\/code>/);
  assert.match(html, /&lt;slug&gt;/);
  assert.doesNotMatch(html, /<slug>/);
});

test("heading ids are unique, entity-aware, and match the outline", () => {
  const html = renderMarkdown('## A & B\n\n## A & B\n\n### A & B\n\n## !!!\n');
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, ["a-b", "a-b-1", "a-b-2", "section"]);
  assert.deepEqual(outline(html), [{ id: "a-b", text: "A & B" }, { id: "a-b-1", text: "A & B" }, { id: "section", text: "!!!" }]);
});

function buttonHarness() {
  let click;
  const attributes = {};
  const button = {
    textContent: "copy", disabled: false,
    setAttribute(name, value) { attributes[name] = value; },
    addEventListener(name, handler) { click = handler; },
    closest() { return { querySelector() { return { textContent: "  npm test  " }; } }; },
  };
  return { button, attributes, root: { querySelectorAll() { return [button]; } }, click: () => click() };
}

test("copy feedback follows clipboard success and resets", async () => {
  const fixture = buttonHarness();
  let copied, reset;
  bindCopyButtons(fixture.root, { async writeText(text) { copied = text; } }, (fn) => { reset = fn; });
  await fixture.click();
  assert.equal(copied, "npm test");
  assert.equal(fixture.button.textContent, "copied");
  assert.equal(fixture.attributes["aria-live"], "polite");
  reset();
  assert.equal(fixture.button.textContent, "copy");
});

test("clipboard failure never claims copied", async () => {
  const fixture = buttonHarness();
  bindCopyButtons(fixture.root, { async writeText() { throw new Error("denied"); } }, () => {});
  await fixture.click();
  assert.equal(fixture.button.textContent, "copy failed");
  assert.equal(fixture.button.disabled, false);
});

test("site lock root matches its manifest and every tarball is integrity pinned", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  assert.equal(lock.lockfileVersion, 3);
  assert.deepEqual(lock.packages[""].dependencies, manifest.dependencies);
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!name) continue;
    assert.match(entry.resolved, /^https:\/\/registry\.npmjs\.org\//, name);
    assert.match(entry.integrity, /^sha512-/, name);
  }
});
