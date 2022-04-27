((img) => {
  const RGBA = new Uint8ClampedArray(img.width * img.height * 4).fill(0);
  console.time("decode");

  // 7 sec
  // const binary = new Uint8ClampedArray((RGBA.length * 3) / 4);
  // RGBA.reverse();
  // for (
  //   let index = {
  //     n: 0,
  //     get rgb() {
  //       return index.n * 3;
  //     },
  //     get rgba() {
  //       return index.n * 4;
  //     },
  //     // 0 - img.height - 1
  //     get i() {
  //       return Math.floor(this.n / img.width);
  //     },
  //     // 0 - img.width * 4 - 1
  //     get j() {
  //       return this.rgb - this.i * img.width * 3;
  //     },
  //     get offset() {
  //       return (img.height - 1 - index.i) * img.width * 3 + index.j;
  //     },
  //   };
  //   index.rgba < RGBA.length;
  //   index.n++
  // ) {
  //   const bottom = RGBA.length - index.rgba - 1;
  //   try {
  //     binary.set(RGBA.subarray(bottom + 1, bottom + 4), index.offset);
  //   } catch (e) {
  //     // console.log(index.n, index.offset);
  //     console.log({ ...index, binary: binary });
  //     throw e;
  //   }
  // }

  // 20 sec
  // const _binary = new Uint8ClampedArray(
  //   img.width * img.height * 4 + img.width * img.height * 3
  // );
  // _binary.set(RGBA, 0);
  // const indexTable = [];
  // for (
  //   let index = {
  //     x: 0,
  //     // 0 - img.height - 1
  //     get i() {
  //       return Math.floor(this.x / img.width / 4);
  //     },
  //     get j() {
  //       return this.x % (img.width * 4);
  //     },
  //     get k() {
  //       return this.x % 4;
  //     },
  //     get s() {
  //       return img.height - 1 - this.i;
  //     },
  //     get t() {
  //       return this.j;
  //     },
  //     get u() {
  //       return 2 - this.k;
  //     },
  //     get y() {
  //       return this.s * img.width * 3 + this.t * 3 + this.u;
  //     },
  //   };
  //   index.x < RGBA.length;
  //   index.x++
  // ) {
  //   if (index.k === 3) {
  //     continue;
  //   }
  //   indexTable.push(index.y);
  // }
  // for (let i = 0; i < indexTable.length; i++) {
  //   if (i % 4 === 3) {
  //     continue;
  //   }
  //   // _binary[indexTable[i]] = RGBA[i];
  //   _binary.copyWithin(
  //     img.width * img.height * 4 + indexTable[i],
  //     i,
  //     i + 1
  //   );
  // }
  // const binary = _binary.subarray(img.width * img.height * 4);

  // 5 ~ 10 sec
  const binary = RGBA.filter((_, i) => i % 4 !== 3);
  for (let i = 0; i < img.height; i++) {
    const subarray = binary.subarray(
      i * img.width * 3,
      (i + 1) * img.width * 3
    );
    for (let j = 0; j < img.width / 2; j++) {
      const slice = subarray.slice(
        (img.width - j - 1) * 3,
        (img.width - j - 1 + 1) * 3
      );
      subarray.copyWithin(img.width - j - 1, j * 3, (j + 1) * 3);
      subarray.set(slice, j * 3);
    }
  }
  binary.reverse();

  // 5 ~ 10 sec
  // const binary = RGBA.filter((_, i) => i % 4 !== 3);
  // const indexTable = [...Array(img.width).keys()].reverse();
  // for (let i = 0; i < img.height; i++) {
  //   const subarray = binary.subarray(i * img.width * 3, (i + 1) * img.width * 3);
  //   for (let j = 0; j < img.width / 2; j++) {
  //     const slice = subarray.slice(indexTable[j] * 3, (indexTable[j] + 1) * 3);
  //     subarray.copyWithin(indexTable[j], j * 3, (j + 1) * 3);
  //     subarray.set(slice, j * 3);
  //   }
  // }
  // binary.reverse();


  // 7 sec
  // const binary = new Uint8ClampedArray((RGBA.length * 3) / 4);
  // for (
  //   let index = {
  //     n: 0,
  //     get rgb() {
  //       return index.n * 3;
  //     },
  //     get rgba() {
  //       return index.n * 4;
  //     },
  //     // 0 - img.height - 1
  //     get i() {
  //       return Math.floor(this.n / img.width);
  //     },
  //     // 0 - img.width * 4 - 1
  //     get j() {
  //       return this.rgb - this.i * img.width * 3;
  //     },
  //     get offset() {
  //       return (img.height - 1 - index.i) * img.width * 3 + index.j;
  //     },
  //   };
  //   index.rgba < RGBA.length;
  //   index.n++
  // ) {
  //   try {
  //     binary.set(
  //       [RGBA[index.rgba + 2], RGBA[index.rgba + 1], RGBA[index.rgba]],
  //       index.offset
  //     );
  //   } catch (e) {
  //     // console.log(index.n, index.offset);
  //     console.log({ ...index, binary: binary });
  //     throw e;
  //   }
  // }
  console.log({ length: binary.length });
  console.timeEnd("decode");
})({ width: 200, height: 10_0000 });
