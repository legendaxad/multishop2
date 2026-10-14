(() => {
  const form = document.querySelector(".sm-auth-card");
  const imageInput = form?.querySelector(".member-image");
  const imagePreview = form?.querySelector(".upload-img-frame");
  const password = form?.querySelector(".member-password");
  const confirmPassword = form?.querySelector(".confirm-password");
  const submitButton = form?.querySelector('button[type="submit"]');
  let previewUrl;

  if (!(form instanceof HTMLFormElement)) return;

  const isSupportedImage = (file) =>
    file &&
    (["image/jpeg", "image/png"].includes(file.type) ||
      /\.(jpe?g|png)$/i.test(file.name));

  if (
    imageInput instanceof HTMLInputElement &&
    imagePreview instanceof HTMLImageElement
  ) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files?.[0];
      imageInput.setCustomValidity(
        file && !isSupportedImage(file)
          ? "Choose a JPG, JPEG, or PNG image."
          : "",
      );

      if (!file || !isSupportedImage(file)) return;

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(file);
      imagePreview.src = previewUrl;
    });
  }

  const validatePasswords = () => {
    if (
      password instanceof HTMLInputElement &&
      confirmPassword instanceof HTMLInputElement
    ) {
      confirmPassword.setCustomValidity(
        confirmPassword.value && password.value !== confirmPassword.value
          ? "Passwords do not match."
          : "",
      );
    }
  };

  password?.addEventListener("input", validatePasswords);
  confirmPassword?.addEventListener("input", validatePasswords);

  window.validateSignupForm = () => {
    validatePasswords();

    if (
      imageInput instanceof HTMLInputElement &&
      (!imageInput.files?.[0] || !isSupportedImage(imageInput.files[0]))
    ) {
      imageInput.setCustomValidity(
        imageInput.files?.[0]
          ? "Choose a JPG, JPEG, or PNG image."
          : "Choose a store profile image.",
      );
    }

    return form.reportValidity();
  };

  form.addEventListener("submit", (event) => {
    if (!window.validateSignupForm()) {
      event.preventDefault();
      return;
    }

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent = "CREATING ACCOUNT…";
      form.setAttribute("aria-busy", "true");
    }
  });

  window.addEventListener(
    "beforeunload",
    () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    { once: true },
  );
})();
