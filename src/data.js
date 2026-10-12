/* Reference data: brands, risky hosts and file types, pressure phrases, severity scale. */
export const BRANDS = [
 ['PayPal',['paypal.com','paypal.me','paypal-community.com','paypalobjects.com']],['Apple',['apple.com','icloud.com']],
 ['Microsoft',['microsoft.com','office.com','outlook.com','live.com','microsoftonline.com','office365.com','sharepoint.com']],
 ['Google',['google.com','gmail.com','youtube.com','googlemail.com','googleusercontent.com','googleapis.com']],['Amazon',['amazon.com','amazon.co.uk','amazonaws.com','amazonses.com']],
 ['Netflix',['netflix.com']],['Chase',['chase.com','jpmorgan.com']],['Wells Fargo',['wellsfargo.com']],
 ['Bank of America',['bankofamerica.com','bofa.com']],['IRS',['irs.gov']],['USPS',['usps.com']],
 ['FedEx',['fedex.com']],['UPS',['ups.com']],['DHL',['dhl.com']],['DocuSign',['docusign.com','docusign.net']],
 ['Dropbox',['dropbox.com','dropboxusercontent.com']],['LinkedIn',['linkedin.com']],['Facebook',['facebook.com','facebookmail.com','meta.com']],
 ['Instagram',['instagram.com']],['Coinbase',['coinbase.com']],['Adobe',['adobe.com']],['Zoom',['zoom.us']],
 ['Venmo',['venmo.com']],['American Express',['americanexpress.com','aexp.com']],['Capital One',['capitalone.com']],
 ['Citi',['citi.com','citibank.com']],['eBay',['ebay.com']],['Walmart',['walmart.com']],['Verizon',['verizon.com']],
 ['Xfinity',['xfinity.com','comcast.net']],['Okta',['okta.com']],['GitHub',['github.com','githubusercontent.com']],
 ['Steam',['steampowered.com','steamcommunity.com']],['Spotify',['spotify.com']],['Norton',['norton.com']],
 ['McAfee',['mcafee.com']],['Geek Squad',['bestbuy.com','geeksquad.com']]
];
export const FUZZY_SKIP = new Set(['gmail','office','outlook','live','meta','apple','chase','steam','icloud','youtube']);
export const FREEMAIL = new Set(['gmail.com','googlemail.com','outlook.com','hotmail.com','live.com','yahoo.com','aol.com','icloud.com','me.com','proton.me','protonmail.com','gmx.com','gmx.net','mail.com','yandex.com','yandex.ru','zoho.com','tutanota.com','mail.ru','qq.com','163.com']);
export const SHORTENERS = new Set(['bit.ly','tinyurl.com','t.co','goo.gl','ow.ly','is.gd','buff.ly','rebrand.ly','cutt.ly','shorturl.at','rb.gy','t.ly','lnkd.in','tiny.cc','s.id','bl.ink','short.io','qrco.de']);
export const BAD_TLDS = new Set(['top','xyz','click','link','zip','mov','icu','cyou','rest','country','gq','tk','ml','cf','ga','buzz','monster','sbs','cfd','quest','live','shop','support']);
export const FREE_HOSTS = ['web.app','firebaseapp.com','pages.dev','workers.dev','r2.dev','glitch.me','ngrok.io','ngrok-free.app','weebly.com','wixsite.com','000webhostapp.com','blogspot.com','github.io','netlify.app','vercel.app','herokuapp.com','repl.co','square.site','godaddysites.com','sites.google.com','forms.gle','typeform.com','ipfs.io','dweb.link'];
export const MULTI = new Set(['co.uk','com.au','co.jp','co.in','com.br','co.nz','com.mx','co.za','org.uk','ac.uk','gov.uk','com.cn','com.tr','com.sg']);
export const RISKY_EXT = {html:'Opens a web page on your device, usually a fake sign-in form',htm:'Opens a web page on your device, usually a fake sign-in form',shtml:'Web page file',xhtml:'Web page file',svg:'Image format that can carry scripts and links',exe:'Runs a program',scr:'Runs a program (screensaver format)',js:'Runs a script',jse:'Runs a script',vbs:'Runs a script',vbe:'Runs a script',wsf:'Runs a script',hta:'Runs an HTML application with full access',bat:'Runs commands',cmd:'Runs commands',ps1:'Runs PowerShell commands',msi:'Installs software',lnk:'Shortcut that can launch hidden commands',iso:'Disk image, often used to sneak past filters',img:'Disk image, often used to sneak past filters',vhd:'Disk image',vhdx:'Disk image',one:'OneNote file, abused to hide malicious scripts',docm:'Office file with macros',xlsm:'Office file with macros',pptm:'Office file with macros',jar:'Runs a Java program',reg:'Changes Windows settings'};
export const ARCHIVE_EXT = new Set(['zip','rar','7z','gz','tar']);
export const CUES = [
 [/\b(urgent(ly)?|immediately|right away|asap)\b/i,'Pressure to act fast'],
 [/\bwithin\s+(24|48|72|twenty[- ]four)\s*hours?\b/i,'Short deadline'],
 [/\b(suspended|locked|disabled|deactivated|restricted|limited|on hold)\b/i,'Threat to your account'],
 [/\b(verify|confirm|validate|update|restore)\s+(your\s+)?(account|identity|information|details|payment|billing|password|credentials|access)\b/i,'Asks you to verify or update details'],
 [/\b(unusual|suspicious|unauthorized)\s+(activity|sign[- ]?in|login|access|transaction)s?\b/i,'Claims suspicious activity'],
 [/\bgift\s?cards?\b/i,'Mentions gift cards'],
 [/\b(wire transfer|bank transfer|bitcoin|crypto(currency)? wallet|zelle)\b/i,'Talks about moving money'],
 [/\b(social security|ssn|pin number|one[- ]time code|verification code)\b/i,'Asks about sensitive numbers or codes'],
 [/\b(legal action|lawsuit|arrest|warrant|penalt(y|ies)|final notice|last warning)\b/i,'Legal or penalty threat'],
 [/\b(you('ve| have) won|winner|claim your|unclaimed|refund of)\b/i,'Promise of money or a prize'],
 [/\bdear (customer|user|client|member|valued|account holder|sir)/i,'Generic greeting instead of your name'],
 [/\bclick (here|below|the (link|button))\b/i,'Pushes you to click'],
 [/\b(invoice|payment|receipt|order)\s+(attached|enclosed|overdue|pending|failed|declined)\b/i,'Unexpected billing notice']
];
export const SEV_PTS = {high:25, medium:12, low:5, info:0};
export const SEV_LABEL = {high:'High risk', medium:'Worth a look', low:'Minor', info:'FYI'};
export const SEV_ORDER = {high:0, medium:1, low:2, info:3};
