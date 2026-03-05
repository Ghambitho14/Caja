# Iconos PWA

Para que "Añadir a la pantalla de inicio" funcione con icono, añade en esta carpeta (`public/`):

- **icon-192.png** — 192×192 px
- **icon-512.png** — 512×512 px (recomendado también para maskable)

Puedes generar los PNG desde `icon.svg` con cualquier editor (Figma, Inkscape, etc.) o con ImageMagick:

```bash
# Ejemplo con ImageMagick (si lo tienes instalado)
convert -background none -resize 192x192 icon.svg icon-192.png
convert -background none -resize 512x512 icon.svg icon-512.png
```

Sin estos archivos la PWA sigue funcionando (caché, offline); solo el icono de instalación usará el genérico del navegador.
