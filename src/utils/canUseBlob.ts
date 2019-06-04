export default function canUseBlob(): boolean {
  const ua = navigator.userAgent;

  const isIOS = /iP(hone|(o|a)d)/.test(ua)
  if (isIOS) {
    const iosVerRegexResult = /ip[honead]{2,4}(?:.*os\s(\w+)\slike\smac)/i.exec(ua);
    if (iosVerRegexResult) {
      const iosVer = iosVerRegexResult[1];
      const iosVerNums = iosVer.split('_');
      const iosVerStr
        = ((iosVerNums[0] === undefined) ? '000' : iosVerNums[0].padStart(3, '0')) // major
        + ((iosVerNums[1] === undefined) ? '000' : iosVerNums[1].padStart(3, '0')) // minor
        + ((iosVerNums[2] === undefined) ? '000' : iosVerNums[2].padStart(3, '0')) // patch
      // Less than iOS12.2 can not use blob
      if (iosVerStr < '012002000') {
        return false;
      }
    }
  }
  return true;
}
