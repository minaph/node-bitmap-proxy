// test
(async () => {
  const URLs = [
    "http://localhost:3000/https://support.google.com/websearch/answer/181196?hl=en-JP",
    "http://localhost:3000/https://www.google.com/webhp?hl=en&sa=X&sqi=2&pjf=1&ved=0ahUKEwi5juynuavzAhV8kmoFHQbNDe8QPAgI",
    "http://localhost:3000/https://myactivity.google.com/product/search?utm_source=google&hl=en",
    "http://localhost:3000/https://myactivity.google.com/privacyadvisor/search?utm_source=googlemenu",
    "http://localhost:3000/https://support.google.com/websearch/?source=g&hl=en-JP",
    "http://localhost:3000/https://www.google.co.jp/intl/en/about/products?tab=wh",
    "http://localhost:3000/https://accounts.google.com/SignOutOptions?hl=en&continue=https://www.google.com/search%3Fq%3Dtypescript%2Bjsdoc%26oq%3Dtype%26aqs%3Dchrome.1.69i60j69i59j69i57j35i39j69i60l2j69i65j69i60%26pf%3Dcs%26sourceid%3Dchrome%26ie%3DUTF-8",
    "http://localhost:3000/https://myaccount.google.com/?utm_source=OGB&tab=wk&authuser=0",
    "http://localhost:3000/https://myaccount.google.com/?utm_source=OGB&tab=wk&authuser=0&utm_medium=act",
    "http://localhost:3000/https://www.google.com/webhp?authuser=0",
    "http://localhost:3000/https://www.google.com/webhp?authuser=1",
    "http://localhost:3000/https://myaccount.google.com/brandaccounts?authuser=0&continue=https://www.google.com/search%3Fq%3Dtypescript%2Bjsdoc%26oq%3Dtype%26aqs%3Dchrome.1.69i60j69i59j69i57j35i39j69i60l2j69i65j69i60%26pf%3Dcs%26sourceid%3Dchrome%26ie%3DUTF-8&service=https://www.google.com/webhp%3Fauthuser%3D%24authuser",
    "http://localhost:3000/https://accounts.google.com/AddSession?hl=en&continue=https://www.google.com/search%3Fq%3Dtypescript%2Bjsdoc%26oq%3Dtype%26aqs%3Dchrome.1.69i60j69i59j69i57j35i39j69i60l2j69i65j69i60%26pf%3Dcs%26sourceid%3Dchrome%26ie%3DUTF-8&ec=GAlAAQ",
    "http://localhost:3000/https://accounts.google.com/Logout?hl=en&continue=https://www.google.com/search%3Fq%3Dtypescript%2Bjsdoc%26oq%3Dtype%26aqs%3Dchrome.1.69i60j69i59j69i57j35i39j69i60l2j69i65j69i60%26pf%3Dcs%26sourceid%3Dchrome%26ie%3DUTF-8&timeStmp=1633168108&secTok=.AG5fkS9PI1nX0tpg8BG3_w-nOrH1TXV_hA&ec=GAdAAQ",
    "http://localhost:3000/https://policies.google.com/privacy?hl=en&authuser=0",
    "http://localhost:3000/https://myaccount.google.com/termsofservice?hl=en&authuser=0",
    "http://localhost:3000/https://maps.google.com/maps?q=typescript+jsdoc&um=1&ie=UTF-8&sa=X&sqi=2&ved=2ahUKEwi5juynuavzAhV8kmoFHQbNDe8Q_AUoA3oECAEQBQ",
    "http://localhost:3000/https://www.google.com/flights?q=typescript+jsdoc&sxsrf=AOaemvJAiI0pht8CwVrDiRcp9bAo0XgA6w:1633168108759&source=lnms&tbm=flm&sa=X&sqi=2&ved=2ahUKEwi5juynuavzAhV8kmoFHQbNDe8Q_AUoAnoECAEQDA",
    "http://localhost:3000/https://www.google.com/finance?sa=X&sqi=2&ved=2ahUKEwi5juynuavzAhV8kmoFHQbNDe8Q_AUoA3oECAEQDQ",
    "http://localhost:3000/https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html",
    "http://localhost:3000/https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#type",
    "http://localhost:3000/https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#param-and-returns",
    "http://localhost:3000/https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#typedef-callback-and-param",
    "http://localhost:3000/https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#enum",
    "http://localhost:3000/https://www.typescriptlang.org/ja/docs/handbook/jsdoc-supported-types.html",
    "http://localhost:3000/https://translate.google.com/translate?hl=en&sl=ja&u=https://www.typescriptlang.org/ja/docs/handbook/jsdoc-supported-types.html&prev=search&pto=aue",
    "http://localhost:3000/https://www.typescriptlang.org/play/javascript/modern-javascript/jsdoc-support.js.html",
    "http://localhost:3000/https://zenn.dev/azukiazusa/articles/c89d4bdc7dacf2",
    "http://localhost:3000/https://translate.google.com/translate?hl=en&sl=ja&u=https://zenn.dev/azukiazusa/articles/c89d4bdc7dacf2&prev=search&pto=aue",
    "http://localhost:3000/https://zenn.dev/azukiazusa/articles/c89d4bdc7dacf2#%E5%9F%BA%E6%9C%AC%E7%9A%84%E3%81%AA%E5%9E%8B",
    "http://localhost:3000/https://zenn.dev/azukiazusa/articles/c89d4bdc7dacf2#union%E5%9E%8B",
    "http://localhost:3000/https://zenn.dev/azukiazusa/articles/c89d4bdc7dacf2#enum",
    "http://localhost:3000/https://zenn.dev/azukiazusa/articles/c89d4bdc7dacf2#%E3%82%A4%E3%83%B3%E3%83%9D%E3%83%BC%E3%83%88%E5%9E%8B",
    "http://localhost:3000/https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html",
    "http://localhost:3000/https://webcache.googleusercontent.com/search?q=cache:pbtUIH3duO4J:https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html+&cd=6&hl=en&ct=clnk&gl=jp",
    "http://localhost:3000/https://learning-notes.mistermicheels.com/javascript/typescript/runtime-type-checking/",
    "http://localhost:3000/https://marketplace.visualstudio.com/items?itemName=salbert.comment-ts",
    "http://localhost:3000/https://www.typescriptlang.org/docs/handbook/2/type-declarations.html",
    "http://localhost:3000/https://runebook.dev/ja/docs/typescript/jsdoc-supported-types",
    "http://localhost:3000/https://translate.google.com/translate?hl=en&sl=ja&u=https://runebook.dev/ja/docs/typescript/jsdoc-supported-types&prev=search&pto=aue",
    "http://localhost:3000/https://qiita.com/shisama/items/016288d38165d542fffd",
    "http://localhost:3000/https://translate.google.com/translate?hl=en&sl=ja&u=https://qiita.com/shisama/items/016288d38165d542fffd&prev=search&pto=aue",
    "http://localhost:3000/https://wojciechkrysiak.medium.com/typescript-jsdoc-better-docs-7c03b6ea04df",
    "http://localhost:3000/https://www.mobiquity.com/insights/typescript-to-javascript-with-jsdoc-and-back",
    "http://localhost:3000/https://jsdoc.app/",
    "http://localhost:3000/https://jsdoc.app/tags-type.html",
    "http://localhost:3000/https://www.npmjs.com/package/jsdoc-plugin-typescript",
    "http://localhost:3000/https://www.npmjs.com/package/eslint-plugin-jsdoc",
    "http://localhost:3000/https://github.com/Microsoft/TypeScript/wiki/JSDoc-support-in-JavaScript",
    "http://localhost:3000/https://support.google.com/webmasters/answer/7489871?hl=en",
    "http://localhost:3000/https://github.com/openlayers/jsdoc-plugin-typescript",
    "http://localhost:3000/https://code.visualstudio.com/docs/languages/typescript",
    "http://localhost:3000/https://stackoverflow.com/questions/65294867/jsdoc-union-type-with-objects-not-working",
    "http://localhost:3000/https://stackoverflow.com/questions/65294867/jsdoc-union-type-with-objects-not-working/65308590#65308590",
    "http://localhost:3000/https://goulet.dev/posts/how-to-write-ts-interfaces-in-jsdoc/",
    "http://localhost:3000/https://pleiades.io/help/webstorm/creating-jsdoc-comments.html",
    "http://localhost:3000/https://translate.google.com/translate?hl=en&sl=ja&u=https://pleiades.io/help/webstorm/creating-jsdoc-comments.html&prev=search&pto=aue",
    "http://localhost:3000/https://fettblog.eu/typescript-jsdoc-superpowers/",
    "http://localhost:3000/https://www.jetbrains.com/help/phpstorm/creating-jsdoc-comments.html",
    "http://localhost:3000/https://gils-blog.tayar.org/posts/jsdoc-typings-all-the-benefits-none-of-the-drawbacks/",
    "http://localhost:3000/https://oita.oika.me/2018/12/23/typescript-jsdoc/",
    "http://localhost:3000/https://translate.google.com/translate?hl=en&sl=ja&u=https://oita.oika.me/2018/12/23/typescript-jsdoc/&prev=search&pto=aue",
    "http://localhost:3000/https://www.educba.com/typescript-jsdoc/",
    "http://localhost:3000/https://dev.to/kamranayub/why-you-don-t-need-types-in-jsdoc-when-documenting-typescript-1pb0",
    "http://localhost:3000/https://react-typescript-cheatsheet.netlify.app/docs/migration/js_docs/",
    "http://localhost:3000/https://eslint.org/docs/rules/valid-jsdoc",
    "http://localhost:3000/https://unpkg.com/jsdoc-plugin-typescript@2.0.6/",
    "http://localhost:3000/https://typescript-kr.github.io/pages/jsdoc-reference.html",
    "http://localhost:3000/https://translate.google.com/translate?hl=en&sl=ko&u=https://typescript-kr.github.io/pages/jsdoc-reference.html&prev=search&pto=aue",
    "http://localhost:3000/https://blog.cloudflare.com/generating-documentation-for-typescript-projects/",
    "http://localhost:3000/https://snyk.io/vuln/npm:jsdoc-plugin-typescript",
    "http://localhost:3000/https://snyk.io/vuln/npm:jsdoc-plugin-typescript",
    "http://localhost:3000/https://codewithhugo.com/jsdoc-typescript-typings-types-d-ts/",
    "http://localhost:3000/https://typedoc.org/guides/doccomments/",
    "http://localhost:3000/https://www.youtube.com/watch?v=-gaLriaslpg",
    "http://localhost:3000/https://www.youtube.com/watch?v=kB0G9nCaCSE",
    "http://localhost:3000/https://www.youtube.com/watch?v=kB0G9nCaCSE&t=246",
    "http://localhost:3000/https://www.youtube.com/watch?v=kB0G9nCaCSE&t=739",
    "http://localhost:3000/https://www.youtube.com/watch?v=kB0G9nCaCSE&t=1274",
    "http://localhost:3000/https://www.youtube.com/watch?v=kB0G9nCaCSE&t=1304",
    "http://localhost:3000/https://www.youtube.com/watch?v=kB0G9nCaCSE&t=1600",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=0",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=232",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=295",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=575",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=739",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=762",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=957",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=1080",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=1247",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=1402",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=1485",
    "http://localhost:3000/https://www.youtube.com/watch?v=La56RcRrPIo&t=2154",
    "http://localhost:3000/https://esdiscuss.org/topic/since-jsdoc-seems-cerebrally-dead",
    "http://localhost:3000/https://books.google.co.jp/books?id=pvGrDwAAQBAJ&pg=PA343&lpg=PA343&dq=typescript+jsdoc&source=bl&ots=eK0FYlM7tJ&sig=ACfU3U0xeyY0FJ0ulm3QAwjt_XnbswcQ8w&hl=en&sa=X&sqi=2&ved=2ahUKEwi5juynuavzAhV8kmoFHQbNDe8Q6AF6BAhREAM",
    "http://localhost:3000/https://translate.google.com/translate?hl=en&sl=ja&u=http://smart.ataglance.jp/2016-02-18-generate-documents-from-typescript/&prev=search&pto=aue",
    "http://localhost:3000/https://pgmemo.tokyo/archive/1919",
    "http://localhost:3000/https://translate.google.com/translate?hl=en&sl=ja&u=https://pgmemo.tokyo/archive/1919&prev=search&pto=aue",
    "http://localhost:3000/https://books.google.co.jp/books?id=wD63DwAAQBAJ&pg=PA224&lpg=PA224&dq=typescript+jsdoc&source=bl&ots=YwyRv44r-f&sig=ACfU3U0HUzGSis_A2utC2x4t5IYIvjCoWw&hl=en&sa=X&sqi=2&ved=2ahUKEwi5juynuavzAhV8kmoFHQbNDe8Q6AF6BAhQEAM",
    "http://localhost:3000/https://twitter.com/rich_harris/status/1323758415504646144?lang=en",
    "http://localhost:3000/https://www.youtube.com/watch?v=mAqLHrUVm1A",
    "http://localhost:3000/https://www.youtube.com/watch?v=mAqLHrUVm1A",
    "http://localhost:3000/https://en.wikipedia.org/wiki/JSDoc",
    "http://localhost:3000/https://support.google.com/websearch/?p=ws_results_help&hl=en-JP&fg=1",
    "http://localhost:3000/https://policies.google.com/privacy?hl=en-JP&fg=1",
    "http://localhost:3000/https://policies.google.com/terms?hl=en-JP&fg=1",
  ];

  var controller = new AbortController();
  var signal = controller.signal;
  // @ts-ignore
  window["__abort" as any] = () => controller.abort() as any;

  var a = URLs
    // .slice(-3)
    .map((x) => fetch(x, { signal }));
  await Promise.all(a);
  // console.log("done", { total });
})();