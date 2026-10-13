// msgreader and iconv-lite expect Node's Buffer global. Imported before msgreader so it exists when that code runs.
import { Buffer } from 'buffer';
globalThis.Buffer ??= Buffer;
