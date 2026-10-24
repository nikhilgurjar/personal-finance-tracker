import test from 'node:test';
import assert from 'node:assert';
import { cleanFinanceName } from './goalUtils';

test('cleanFinanceName', async (t) => {
  await t.test('handles standard names correctly', () => {
    assert.strictEqual(cleanFinanceName("Groceries"), "groceries");
    assert.strictEqual(cleanFinanceName("Rent Payment"), "rent payment");
  });

  await t.test('converts to lowercase', () => {
    assert.strictEqual(cleanFinanceName("APPLE"), "apple");
    assert.strictEqual(cleanFinanceName("WeIrD CaSiNg"), "weird casing");
  });

  await t.test('removes content in parentheses', () => {
    assert.strictEqual(cleanFinanceName("Target (store)"), "target");
    assert.strictEqual(cleanFinanceName("Salary (Jan)"), "salary");
    assert.strictEqual(cleanFinanceName("Whole Foods (1234) Market"), "whole foods market");
  });

  await t.test('removes non-alphanumeric characters', () => {
    assert.strictEqual(cleanFinanceName("Amazon.com!"), "amazon com");
    assert.strictEqual(cleanFinanceName("Cafe #123 & Bar"), "cafe 123 bar");
    assert.strictEqual(cleanFinanceName("User_Name-123"), "user name 123");
  });

  await t.test('collapses and trims spaces', () => {
    assert.strictEqual(cleanFinanceName("  Too   many   spaces  "), "too many spaces");
    assert.strictEqual(cleanFinanceName("\tTabs\tand\nNewlines\r"), "tabs and newlines");
  });

  await t.test('handles null and undefined', () => {
    assert.strictEqual(cleanFinanceName(null), "");
    assert.strictEqual(cleanFinanceName(undefined), "");
  });

  await t.test('handles non-string types smoothly', () => {
    assert.strictEqual(cleanFinanceName(12345), "12345");
    assert.strictEqual(cleanFinanceName(0), "0");
    assert.strictEqual(cleanFinanceName(true), "true");
    assert.strictEqual(cleanFinanceName(false), "false");
    // {} converts to "[object Object]" -> "object object" due to non-alphanumeric replacement
    assert.strictEqual(cleanFinanceName({}), "object object");
  });
});
