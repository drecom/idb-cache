export default function canUseBlob(): boolean {
  const ua = navigator.userAgent;

  const isIOS = /iP(hone|(o|a)d)/.test(ua)
  if (isIOS) {
    const iosVerRegexResult = /ip[honead]{2,4}(?:.*os\s(\w+)\slike\smac)/i.exec(ua);
    if (iosVerRegexResult) {
      const iosVer = iosVerRegexResult[1];
      const [major = '', minor = '', patch = ''] = iosVer.split('_');
      const iosVerStr
        = ('000' + major).slice(-3)
        + ('000' + minor).slice(-3)
        + ('000' + patch).slice(-3);
      // Less than iOS12.2 can not use blob
      if (iosVerStr < '012002000') {
        return false;
      }
    }
  }
  return true;
}
