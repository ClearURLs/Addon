export type RedirectDecodeStep = 'percent' | 'form' | 'base64' | 'base64url';
export interface RedirectDecodeOptions {
    readonly decode: readonly RedirectDecodeStep[];
    readonly defaultScheme?: 'http' | 'https';
}
export interface CompiledRedirectRule {
    readonly id: string;
    readonly pattern: string;
    readonly expression: RegExp;
    readonly resolve: (captures: readonly (string | undefined)[]) => string | null;
}
/** Compile an explicit catalog redirect into a matcher and a target resolver. */
export declare function compileDeclaredRedirect(rule: unknown): CompiledRedirectRule | null;
/**
 * Decode a redirect capture using the published legacy behavior by default.
 * Options limit decoding to the declared steps and optional scheme completion.
 * An unusable target returns null so the caller can try the next redirect rule.
 */
export declare function decodeRedirectTarget(capture: string, options?: RedirectDecodeOptions): string | null;
