// =============================================================
// Utilitaire QR Code
// Génère le contenu du QR code (URL vers le passeport numérique)
// et l'image en base64 pour affichage et impression.
// =============================================================
import QRCode from 'qrcode'

// URL du passeport numérique d'un équipement
// Cette URL est scannable par n'importe quel lecteur QR
export function getPassportUrl(equipmentId: string): string {
  return `${window.location.origin}/equipement/${equipmentId}`
}

// Génère une image QR Code en base64 (pour <img src="...">)
export async function generateQRCodeDataUrl(equipmentId: string): Promise<string> {
  const url = getPassportUrl(equipmentId)
  return QRCode.toDataURL(url, {
    width: 256,
    margin: 2,
    color: {
      dark: '#1e1b4b',  // Indigo foncé — couleur de marque
      light: '#ffffff',
    },
  })
}

// Déclenche l'impression du QR code dans une nouvelle fenêtre
export async function printQRCode(equipmentId: string, equipmentName: string) {
  const dataUrl = await generateQRCodeDataUrl(equipmentId)

  const printWindow = window.open('', '_blank', 'width=400,height=500')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>QR Code — ${equipmentName}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          img { width: 200px; height: 200px; }
          p { margin: 8px 0; font-size: 14px; }
          .name { font-weight: bold; font-size: 16px; }
          .id { font-size: 11px; color: #666; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" alt="QR Code" />
        <p class="name">${equipmentName}</p>
        <p class="id">ID: ${equipmentId}</p>
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
