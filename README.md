# 🐷 Alcancía · Ahorro bonito

PWA de ahorro motivador: pones una meta, metes monedas y una jarra de vidrio se llena
de oro con ondas y lluvia de monedas animadas (GSAP). Cuando la completas, suena tu
fanfarria. Gratis, sin cuentas y funciona **sin internet**.

## Qué puede
- 🎯 **Una meta a la vez**: nombre (ej: «Viaje a la playa») y objetivo.
- 🪙 **Meter dinero** con montos rápidos (+10, +50…) y nota opcional.
- 📜 **Historial** completo con fecha de cada movimiento y **retiros**.
- 🎵 **Sonidos propios**: sube tu `.mp3` para el clink de monedas y la fanfarria
  (Ajustes → Tus sonidos). De fábrica, los sonidos se sintetizan con WebAudio.
- 🗹 **Tema blanco y negro** con un toque (☀/🌙) — se guarda tu elección.
- 📱 **Instalable** en iPhone (Safari → Compartir → Añadir a pantalla de inicio)
  y en Android/PC. Guía automática en el teléfono la primera vez.

## Probar en la PC
Doble clic en `servir.bat` → `http://localhost:4178`.

## Publicar
GitHub + Vercel (estático, sin build). Al abrir por primera vez el service worker
cachea todo para el modo sin conexión.

## Privacidad
Todo vive en tu dispositivo (localStorage + IndexedDB para los sonidos propios).
No hay servidores, cuentas ni rastreo.
