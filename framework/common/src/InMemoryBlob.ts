export class InMemoryBlob extends Blob {
  constructor(public content: Buffer<ArrayBuffer>) {
    super([content]);
  }
}
