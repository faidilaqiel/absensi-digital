import React from 'react';

export default function SchoolLogo({ className = "w-10 h-10" }) {
  return (
    <img
      src="/logo.png"
      alt="Logo Resmi SDN Pengampon 3 Kota Cirebon"
      className={`${className} object-contain rounded-full`}
    />
  );
}
