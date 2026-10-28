# Reto 6

Visualización interactiva desarrollada con p5.js.

## Publicación con GitHub Actions

1. Sube los cambios a la rama `main`.
2. En GitHub, abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **GitHub Actions**.
4. El flujo incluido en `.github/workflows/pages.yml` valida JavaScript y publica automáticamente.
5. Abre la ejecución en **Actions** si necesitas revisar el despliegue.

También puedes ejecutarlo manualmente desde **Actions → Deploy static page to GitHub Pages → Run workflow**.

No es necesario realizar una compilación ni crear un `package.json`: GitHub Actions empaqueta directamente los archivos estáticos.

## Controles principales

- `Enter`: reproducir audio.
- `R`: reiniciar la canción y la visualización.
- `Espacio`: perturbación general.
- `7`, `8`, `9`, `0`: escenas geométricas.
- `S`: volver al organismo libre.
- `↑` / `↓`: subir o bajar el volumen.
- Clic: ruptura localizada.
- Arrastrar con el mouse presionado: dirigir partículas y dejar rastros.

## Audio

El archivo de audio no se incluye en el repositorio. Para usar la visualización, coloca un archivo autorizado con el nombre `maretu.mp3` en la raíz del proyecto antes de publicar. GitHub Pages solo debe usarse con material para el cual tengas permiso de distribución.
