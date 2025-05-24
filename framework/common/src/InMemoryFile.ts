export class InMemoryFile extends File {
  constructor(
    public content: string,
    name: string,
    {
      type,
      endings,
      lastModified
    }: {
      type?: string;
      endings?: 'transparent' | 'native';
      lastModified?: number;
    }
  ) {
    super([Buffer.from(content)], name, {
      type,
      endings,
      lastModified
    });
  }
}
