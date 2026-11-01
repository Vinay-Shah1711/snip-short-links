import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function QRBox({ value, name }) {
  const ref = useRef(null);

  function download() {
    const canvas = ref.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${name}-qr.png`;
    a.click();
  }

  return (
    <div className="flex items-center gap-4">
      <div ref={ref} className="rounded-xl bg-white p-2">
        <QRCodeCanvas value={value} size={112} level="M" />
      </div>
      <div>
        <p className="text-sm font-semibold">QR code</p>
        <p className="mb-2 text-xs text-slate-400">Scan to test it on your phone.</p>
        <button onClick={download} className="btn-ghost !py-1.5 text-xs">Download PNG</button>
      </div>
    </div>
  );
}
