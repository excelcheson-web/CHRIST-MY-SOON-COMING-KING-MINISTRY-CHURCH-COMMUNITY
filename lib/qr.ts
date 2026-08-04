import 'server-only'

import QRCode from 'qrcode'

/**
 * QR codes are rendered locally and embedded as data URIs.
 *
 * No third-party image service is involved, which matters: the alternative
 * would post a token that admits someone to a church event to an external
 * server every time a ticket is displayed.
 */
export async function registrationQrDataUrl(token: string, siteUrl: string) {
  // Encoding a URL rather than a bare token means a phone's default camera app
  // offers "open link" and lands the volunteer on the check-in screen.
  const payload = `${siteUrl.replace(/\/$/, '')}/check-in/${token}`

  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: {
      // Ministry navy on white — high contrast so cheap scanners cope.
      dark: '#2A2D6B',
      light: '#FFFFFF',
    },
  })
}
