// Exposes MsgReader as window.MsgReader. Loaded on demand by src/index.html when a .msg file is opened.
const MsgReader = require('@kenjiuno/msgreader').default;
window.MsgReader = MsgReader;
