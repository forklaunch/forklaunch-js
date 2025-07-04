export class InMemoryBlob extends Blob {
  constructor(public content: string) {
    super([Buffer.from(content)]);
  }
}
