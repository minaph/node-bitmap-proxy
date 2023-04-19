/**
 * これらのテストケースは、次のようなことを確認しています。
 * 
 * - ContentEncoding.getが、headersオブジェクトから正しいContent-Encodingヘッダーの値を取得できるかどうか。
 * - ContentEncoding.fromRequestが、Accept-Encodingヘッダーから正しいエンコーディングを選択できるかどうか。
 * - ContentEncoding.encodeが、指定されたエンコーディングでデータを正しく圧縮できるかどうか。
 * 
 * @module ContentEncodingTest
 */

import { BinaryBuilder } from '../src/BinaryBuilder';
import { expect, test, vi, assert } from "vitest"


test('BinaryBuilder#push', () => {
  const builder = new BinaryBuilder(10);

  builder.push(1, 1);
  builder.push(256, 2);
  builder.push(65536, 3);
  builder.push(16777216, 4);

  const expected = Buffer.from([1, 0, 1, 0, 0, 1, 0, 0, 0, 1]);
  const actual = builder.end();

  assert.deepEqual(actual, expected);
});

test('BinaryBuilder#append', () => {
  const builder = new BinaryBuilder(8);

  builder.append(Buffer.from([1, 2, 3, 4]));
  builder.append(Buffer.from([5, 6, 7, 8]));

  const expected = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const actual = builder.end();

  assert.deepEqual(actual, expected);
});

test('BinaryBuilder#make', () => {
  const expected = Buffer.from([1, 2, 3, 4]);
  const actual = BinaryBuilder.make([1, 2, 3, 4]);

  assert.deepEqual(actual, expected);
});


test('make method should create a buffer from the given array', () => {
  const arr = [1, 2, 3];
  const result = BinaryBuilder.make(arr);
  expect(result).toEqual(Buffer.from([1, 2, 3]));
});
