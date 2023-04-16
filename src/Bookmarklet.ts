// Step 1: 機能を追加
function removeSpaces(code: string, removeTabs: boolean = false, removeNewLines: boolean = false): string {
  let result = code
    .split("\n")
    .map((line) => line.trim())
    .join(" ");

  if (removeTabs) {
    result = result.replace(/\t/g, "");
  }

  if (removeNewLines) {
    result = result.replace(/\n/g, "");
  }

  return result;
}


function padStartAllLines(padSize: number, code: string): string {
  const lines = code.split("\n");

  lines[0] = lines[0].padStart(padSize);

  const pad = lines.reduce((acc, line) => {
    const firstNonWhiteSpaceIndex = line.trim().search(/\S/);
    return Math.min(acc, firstNonWhiteSpaceIndex === -1 ? 0 : firstNonWhiteSpaceIndex);
  }, Infinity);

  return lines
    .map((line) => {
      const diff = padSize - pad;
      return diff > 0 ? line.padStart(line.length + diff) : line.slice(pad - diff);
    })
    .join("\n");
}

type VoidOrArray<entryParams> = Array<entryParams> | void;

type FlexFunc<entryParams> =
  | ((...args: entryParams extends Array<any> ? entryParams : never) => any)
  | (() => any);


type WrappedFlexFunc<entryParams> = entryParams extends Array<any> ? (...args: entryParams) => ReturnType<FlexFunc<entryParams>> : () => ReturnType<FlexFunc<entryParams>>;

// Bookmarkletクラスに関しては、Step 3とStep 4の最適化やエラーハンドリングを含めたリファクタリングを行っています。

/**
 * このコードは、Bookmarkletクラスを定義するためのコードです。Bookmarkletは、ブラウザのブックマークバーに追加することができ、ブックマークがクリックされると実行されるJavaScriptのコードスニペットです。

Bookmarkletクラスは以下の役割を持ちます：

- Bookmarkletのentry関数と依存関数を保持
- インデントされたブロックの形式でコードを生成
- シリアライズされたコードを返す
- entry関数を実行する関数を生成
- 引数を受け取るブックマークレットのURLを生成
 */
class Bookmarklet<entryParams> {
  constructor(
    public readonly entry: FlexFunc<entryParams>,
    private deps: (Function | Bookmarklet<any>)[],
    private padSize = 2
  ) {
    if (typeof entry !== "function") {
      throw new Error("entry must be a function.");
    }
    if (!Array.isArray(deps)) {
      throw new Error("deps must be an array of functions or Bookmarklets.");
    }

    if (typeof padSize !== "number" || padSize < 0) {
      throw new Error("padSize must be a non-negative number.");
    }

  }

  public get name(): string {
    return this.entry.name;
  }

  private serializeDeps(currentPadSize: number): string {
    const code = this.deps
      .map((dep) => `const ${dep.name} = ${dep.toString()};`)
      .join("");
    return padStartAllLines(currentPadSize, code);

  }

  private get depsOneline(): string {
    return removeSpaces(this.serializeDeps(0));
  }

  private get entryOneline(): string {
    let code = this.entry.toString();
    return removeSpaces(code);
  }

  private generateCode(currentPadSize = 0): string {
    const entry = padStartAllLines(
      currentPadSize + this.padSize,
      "return " + this.entry.toString()
    );
    return `{ \n${this.serializeDeps(currentPadSize + this.padSize)} \n${entry} \n }`;
  }

  toString(currentPadSize = 0): string {
    return `(() => ${this.generateCode(currentPadSize)})();`;
  }

  toFunction(currentPadSize = 0): () => WrappedFlexFunc<entryParams> {
    const code = this.generateCode(currentPadSize);
    const namedFunction: () => WrappedFlexFunc<entryParams>
      = new Function(`return (() => ${code})()`) as any;

    Object.defineProperty(namedFunction, "name", {
      value: this.name,
      writable: false,
    });

    return namedFunction;
  }

  bookmarklet(argsFunc: () => VoidOrArray<entryParams>): string {
    return `javascript: (() => {${this.depsOneline} (${this.entryOneline}) ((${argsFunc.toString().replace(/\n/g, "")}) ()) })();`;
  }
}

export { Bookmarklet };