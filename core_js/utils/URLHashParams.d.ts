/**
 * Models a hash parameter of a given {@link URL}.
 */
export default class URLHashParams {
    private _params;
    constructor(url: URL);
    /** Number of segments, including empty segments and duplicate entries. */
    get size(): number;
    append(name: string, value?: string | null): void;
    delete(name: string): void;
    /** Delete matching entries and report whether any were removed. */
    deleteMatching(predicate: (name: string, value: string | null) => boolean): boolean;
    get(name: string): string | null;
    getAll(name: string): Set<string | null>;
    keys(): IterableIterator<string>;
    toString(): string;
}
