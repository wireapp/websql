/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

export function isIEOrLegacyEdge(): boolean {
  // IE 10               Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)
  // IE 11               Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko
  // Edge 12 (Spartan)   Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0
  // Edge 13             Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586
  // Edge 77             Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.19 Safari/537.36 Edg/77.0.235.9

  // Do not detect "Edge" user agent since it's Chromium

  const userAgent = window.navigator.userAgent;
  return userAgent.indexOf('MSIE ') > 0 || userAgent.indexOf('Trident/') > 0 || userAgent.indexOf('Edge/') > 0;
}
