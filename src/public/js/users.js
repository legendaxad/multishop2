$(function () {
  // Stagger animation for table rows
  $(".sm-table tbody tr").each(function (index) {
    $(this).css("animation-delay", `${Math.min(index * 35, 350)}ms`);
  });

  // Handle member status updates
  $(".member-status").each(function () {
    const $select = $(this);
    $select.data("savedValue", $select.val());

    $select.on("change", async function () {
      const memberId = $select.attr("data-id");
      const previousValue = $select.data("savedValue");

      if (!memberId) {
        window.alert(
          "This customer is missing its account ID. The status was not saved."
        );
        $select.val(previousValue || "");
        return;
      }

      if (
        $select.val() === "DELETE" &&
        !window.confirm("Mark this customer account as deleted?")
      ) {
        $select.val(previousValue || "");
        return;
      }

      $select.prop("disabled", true);

      try {
        const response = await fetch("/admin/user/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _id: memberId,
            memberStatus: $select.val(),
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

        $select.data("savedValue", $select.val());
      } catch (error) {
        $select.val(previousValue || "");
        window.alert(
          error instanceof Error
            ? `Could not update customer status: ${error.message}`
            : "Could not update customer status."
        );
      } finally {
        $select.prop("disabled", false);
      }
    });
  });
});