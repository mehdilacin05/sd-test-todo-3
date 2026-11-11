import test from "node:test";
import assert from "node:assert/strict";
import { parseTodoText, parsePage, parseStatus } from "../lib/todo.ts";

test("validates text by Unicode characters and trims Unicode whitespace", () => {
  assert.equal(parseTodoText("  vier  "), "vier");
  assert.equal(parseTodoText("\u0085 vier \u0085"), "vier");
  assert.equal(parseTodoText("abc"), null);
  assert.equal(parseTodoText("😀😀😀😀"), "😀😀😀😀");
  assert.equal(parseTodoText("x".repeat(1001)), null);
  assert.equal(parseTodoText(null), null);
});

test("parses pages and statuses strictly", () => {
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage("2"), 2);
  assert.equal(parsePage("-1"), null);
  assert.equal(parsePage("2x"), null);
  assert.equal(parsePage("999999999999999999999"), null);
  assert.equal(parseStatus("true"), true);
  assert.equal(parseStatus("false"), false);
  assert.equal(parseStatus("yes"), null);
});
