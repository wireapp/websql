export function isIEOrLegacyEdge(): boolean {
    // IE 10               Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)
    // IE 11               Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko
    // Edge 12 (Spartan)   Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0
    // Edge 13             Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586
    // Edge 77             Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.19 Safari/537.36 Edg/77.0.235.9
    
    // Do not detect "Edg" user agent since it's Chromium

    const userAgent = window.navigator.userAgent;
    return userAgent.indexOf('MSIE ') > 0 || userAgent.indexOf('Trident/') > 0 || userAgent.indexOf('Edge/') > 0;
  }