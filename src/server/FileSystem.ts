import fs from "fs";
import fsPromise from "fs/promises";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const bucket = storage.bucket('node-bitmap-proxy-yuki');

export interface ServerFileSystem {
  isExists(fileId: string): Promise<boolean>;
  validateFileId(fileId: string): Promise<boolean>;
  writeFile(fileId: string, data: string): Promise<void>;
  readFile(fileId: string): Promise<string>;
  remove(fileId: string, options: { recursive: boolean; force: boolean; }): Promise<void>;
}

export interface FSAdditionalUtil {
  isAllExists(fileIds: string[]): Promise<boolean>;
  readAllFiles(fileIds: string[]): Promise<string>;
  removeAllFiles(fileIds: string[]): Promise<void>;
}

export class LocalFileSystem implements ServerFileSystem, FSAdditionalUtil {
  isExists(fileId: string) {
    return Promise.resolve(fs.existsSync(fileId));
  }
  async validateFileId(fileId: string): Promise<boolean> {
    return fsPromise.mkdir(fileId).then(() => true, () => false);
  }
  writeFile(fileId: string, data: string) {
    fs.writeFileSync(fileId, data);
    return Promise.resolve();
  }
  readFile(fileId: string) {
    return Promise.resolve(fs.readFileSync(fileId).toString());
  }
  remove(fileId: string, options: { recursive: boolean; force: boolean; }) {
    return Promise.resolve(fs.rmSync(fileId, options));
  }

  isAllExists(fileIds: string[]) {
    return Promise.resolve(fileIds.every((fileId) => this.isExists(fileId)));
  }

  readAllFiles(fileIds: string[]) {
    return Promise.resolve(fileIds.map((fileId) => this.readFile(fileId)).join(""));
  }

  removeAllFiles(fileIds: string[]) {
    return Promise.resolve(
      fileIds.forEach((fileId) => this.remove(fileId, { recursive: true, force: true }))
    );
  }
}
export class GoogleCloudStorage implements ServerFileSystem, FSAdditionalUtil {
  isExists(fileId: string) {
    return bucket.file(fileId).exists().then((data) => data[0]);
  }
  async validateFileId(fileId: string): Promise<boolean> {
    return Promise.resolve(true);
  }
  writeFile(fileId: string, data: string) {
    return bucket.file(fileId).save(data);
  }
  async readFile(fileId: string): Promise<string> {
    return (await bucket.file(fileId).download())[0].toString();
  }
  remove(fileId: string) {
    return bucket.file(fileId).delete().then(() => undefined);
  }

  isAllExists(fileIds: string[]) {
    return Promise.all(fileIds.map((fileId) => this.isExists(fileId))).then((data) => data.every((d) => d));
  }

  readAllFiles(fileIds: string[]) {
    return Promise.all(fileIds.map((fileId) => this.readFile(fileId))).then(x => x.join(""));
  }

  removeAllFiles(fileIds: string[]) {
    return Promise.all(fileIds.map((fileId) => this.remove(fileId))).then(() => undefined);
  }
}
