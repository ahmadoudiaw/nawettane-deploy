'use client';

import { QRCodeSVG } from 'qrcode.react';

export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      bgColor="#ffffff"
      fgColor="#0f172a"
      level="M"
      marginSize={2}
    />
  );
}
