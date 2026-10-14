(() => {
  const productForm = document.querySelector("#new-product");
  const addButton = document.querySelector('a[href="#new-product"]');

  document.querySelectorAll(".sm-table tbody tr").forEach((row, index) => {
    row.style.animationDelay = `${Math.min(index * 35, 350)}ms`;
  });

  addButton?.addEventListener("click", (event) => {
    const form = document.querySelector("#new-product");
    if (!(form instanceof HTMLFormElement)) return;

    event.preventDefault();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    form.querySelector("input[name='productName']")?.focus({
      preventScroll: true,
    });
  });

  if (productForm instanceof HTMLFormElement) {
    const sizesInput = productForm.querySelector("#product-sizes");
    const submitButton = productForm.querySelector('button[type="submit"]');
    const fileInputs = productForm.querySelectorAll(
      'input[type="file"][name="productImages"]',
    );
    const isImageFile = (file) =>
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif)$/i.test(file.name);

    const validateSizes = () => {
      if (!(sizesInput instanceof HTMLInputElement)) return true;
      const sizes = sizesInput.value
        .split(",")
        .map((size) => size.trim())
        .filter(Boolean);
      const valid =
        sizes.length > 0 &&
        sizes.every((size) => /^(3[89]|4[0-5])$/.test(size)) &&
        new Set(sizes).size === sizes.length;

      sizesInput.setCustomValidity(
        valid
          ? ""
          : "Enter unique EU sizes from 38 to 45, separated by commas.",
      );
      return valid;
    };

    sizesInput?.addEventListener("input", validateSizes);

    fileInputs.forEach((input) => {
      input.addEventListener("change", () => {
        const label = input.closest(".sm-file-tile");
        const caption = label?.querySelector("span");
        const file = input.files?.[0];
        if (caption) {
          caption.textContent = file
            ? `✓ ${file.name}`
            : `＋ ${input.required ? "Cover image *" : "Add image"}`;
        }

        input.setCustomValidity(file && !isImageFile(file) ? "Choose an image file." : "");
      });
    });

    productForm.addEventListener("submit", (event) => {
      const sizesAreValid = validateSizes();
      const imagesAreValid = Array.from(fileInputs).every(
        (input) => !input.files?.[0] || isImageFile(input.files[0]),
      );

      if (!sizesAreValid || !imagesAreValid || !productForm.reportValidity()) {
        event.preventDefault();
        return;
      }

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "CREATING SNEAKER…";
        productForm.setAttribute("aria-busy", "true");
      }
    });
  }

  document.querySelectorAll(".new-product-status").forEach((select) => {
    if (!(select instanceof HTMLSelectElement)) return;
    select.dataset.savedValue = select.value;

    select.addEventListener("change", async () => {
      const productId = select.dataset.id;
      const previousValue = select.dataset.savedValue;
      if (!productId) {
        window.alert(
          "This sneaker is missing its product ID. The status was not saved.",
        );
        select.value = previousValue || "";
        return;
      }

      if (
        select.value === "DELETE" &&
        !window.confirm("Mark this sneaker as deleted?")
      ) {
        select.value = previousValue || "";
        return;
      }

      select.disabled = true;
      try {
        const response = await fetch(
          `/admin/product/${encodeURIComponent(productId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productStatus: select.value }),
          },
        );
        if (!response.ok) {
          let message = response.statusText;
          try {
            const result = await response.json();
            message = result.message || result.data?.message || message;
          } catch {
            message = response.statusText || "The status update failed.";
          }
          throw new Error(message || "The status update failed.");
        }

        select.dataset.savedValue = select.value;
      } catch (error) {
        select.value = previousValue || "";
        window.alert(
          error instanceof Error
            ? `Could not update sneaker status: ${error.message}`
            : "Could not update sneaker status.",
        );
      } finally {
        select.disabled = false;
      }
    });
  });
})();
