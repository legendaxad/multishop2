(() => {
  document.querySelectorAll(".sm-table tbody tr").forEach((row, index) => {
    row.style.animationDelay = `${Math.min(index * 35, 350)}ms`;
  });

  document.querySelectorAll(".member-status").forEach((select) => {
    if (!(select instanceof HTMLSelectElement)) return;
    select.dataset.savedValue = select.value;

    select.addEventListener("change", async () => {
      const memberId = select.dataset.id;
      const previousValue = select.dataset.savedValue;

      if (!memberId) {
        window.alert(
          "This customer is missing its account ID. The status was not saved.",
        );
        select.value = previousValue || "";
        return;
      }

      if (
        select.value === "DELETE" &&
        !window.confirm("Mark this customer account as deleted?")
      ) {
        select.value = previousValue || "";
        return;
      }

      select.disabled = true;
      try {
        const response = await fetch("/admin/user/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _id: memberId,
            memberStatus: select.value,
          }),
        });

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
            ? `Could not update customer status: ${error.message}`
            : "Could not update customer status.",
        );
      } finally {
        select.disabled = false;
      }
    });
  });
})();
