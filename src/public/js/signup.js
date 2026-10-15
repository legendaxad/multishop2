$(function () {
  const $form = $(".sm-auth-card");
  const $imageInput = $form.find(".member-image");
  const $imagePreview = $form.find(".upload-img-frame");
  const $password = $form.find(".member-password");
  const $confirmPassword = $form.find(".confirm-password");
  const $submitButton = $form.find('button[type="submit"]');
  let previewUrl;

  if (!$form.length) return;

  const isSupportedImage = (file) => {
    return (
      file &&
      (["image/jpeg", "image/png"].includes(file.type) ||
        /\.(jpe?g|png)$/i.test(file.name))
    );
  };

  // Image preview & custom validation
  $imageInput.on("change", function () {
    const file = this.files?.[0];
    const message = file && !isSupportedImage(file) ? "Choose a JPG, JPEG, or PNG image." : "";
    this.setCustomValidity(message);

    if (!file || !isSupportedImage(file)) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    $imagePreview.attr("src", previewUrl);
  });

  // Password matching validation
  const validatePasswords = () => {
    const pass = $password.val();
    const confirmPass = $confirmPassword.val();
    const confirmEl = $confirmPassword[0];

    if (confirmEl) {
      confirmEl.setCustomValidity(
        confirmPass && pass !== confirmPass ? "Passwords do not match." : ""
      );
    }
  };

  $password.on("input", validatePasswords);
  $confirmPassword.on("input", validatePasswords);

  // Global validation function
  window.validateSignupForm = () => {
    validatePasswords();

    const file = $imageInput[0]?.files?.[0];
    const imageEl = $imageInput[0];

    if (imageEl && (!file || !isSupportedImage(file))) {
      imageEl.setCustomValidity(
        file ? "Choose a JPG, JPEG, or PNG image." : "Choose a store profile image."
      );
    }

    return $form[0].reportValidity();
  };

  // Form submit handler
  $form.on("submit", (event) => {
    if (!window.validateSignupForm()) {
      event.preventDefault();
      return;
    }

    if ($submitButton.length) {
      $submitButton.prop("disabled", true).text("CREATING ACCOUNT…");
      $form.attr("aria-busy", "true");
    }
  });

  // Clean up object URL when leaving page
  $(window).one("beforeunload", () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  });
});