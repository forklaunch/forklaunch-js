import { File as InternalFile } from 'node:buffer';

export class File extends InternalFile {
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
