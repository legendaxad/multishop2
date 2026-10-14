(() => {
  const dashboard = document.querySelector(".sm-admin");
  if (!dashboard) return;

  const revealTargets = dashboard.querySelectorAll(
    ".sm-welcome, .sm-section-heading, .sm-action-card",
  );

  revealTargets.forEach((element, index) => {
    element.style.animationDelay = `${Math.min(index * 70, 280)}ms`;
  });

  dashboard.querySelectorAll(".sm-action-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const bounds = card.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 100;
      const y = ((event.clientY - bounds.top) / bounds.height) * 100;
      card.style.setProperty("--pointer-x", `${x}%`);
      card.style.setProperty("--pointer-y", `${y}%`);
    });
  });
})();
