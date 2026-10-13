// Entry for the lazily loaded .msg chunk. Keep the shim import first.
import './buffer-shim.js';
import MsgReader from '@kenjiuno/msgreader';
// msgreader is CommonJS compiled from TypeScript, so the class may sit one default deeper.
export default MsgReader.default || MsgReader;
