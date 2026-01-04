declare module "@vercel/kv" {
  // Minimal typing to satisfy TS locally. On Vercel / after installing @vercel/kv,
  // the real module + types will be used.
  export const kv: any;
}



