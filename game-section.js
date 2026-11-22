/* M.A.R.S. — controles de la sección jugable */
document.addEventListener("DOMContentLoaded", () => {
  const gameFrame = document.querySelector("#marsGameFrame");
  const fullscreenButton = document.querySelector("#marsGameFullscreen");

  if (!gameFrame || !fullscreenButton) return;

  fullscreenButton.addEventListener("click", () => {
    const fullscreenTarget = gameFrame;

    if (fullscreenTarget.requestFullscreen) {
      const result = fullscreenTarget.requestFullscreen();
      if (result && typeof result.catch === "function") {
        result.catch((error) => {
          console.warn("No se pudo activar pantalla completa:", error);
        });
      }
    } else {
      window.open(gameFrame.src, "_blank", "noopener,noreferrer");
    }
  });
});
