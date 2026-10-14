(() => {
  const form = document.querySelector(".sm-auth-card");
  if (!(form instanceof HTMLFormElement)) return;

  const submitButton = form.querySelector('button[type="submit"]');
  if (!(submitButton instanceof HTMLButtonElement)) return;

  form.addEventListener("submit", () => {
    if (!form.reportValidity()) return;
    submitButton.disabled = true;
    submitButton.textContent = "SIGNING IN…";
    form.setAttribute("aria-busy", "true");
  });
})();
