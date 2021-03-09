declare module 'html-parse-stringify' {
  export type Node = {
    type: 'tag' | 'text' | 'component';
    name: string;
    attrs: Record<string, string>;
    voidElement: boolean;
    children: Node[];
  };
  export function parse(html: string): Node[];
  export function stringify(node: Node[]): string;
}
