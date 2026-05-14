document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");

  // Banner + announcement management elements
  const announcementRegion = document.getElementById("announcement-region");
  const announcementAdminButton = document.getElementById("announcement-admin-button");
  const announcementModal = document.getElementById("announcement-modal");
  const closeAnnouncementModalButton = document.getElementById("close-announcement-modal");
  const announcementAdminList = document.getElementById("announcement-admin-list");
  const announcementForm = document.getElementById("announcement-form");
  const announcementFormTitle = document.getElementById("announcement-form-title");
  const announcementFormMessage = document.getElementById("announcement-form-message");
  const announcementIdInput = document.getElementById("announcement-id");
  const announcementMessageInput = document.getElementById("announcement-message");
  const announcementStartDateInput = document.getElementById("announcement-start-date");
  const announcementExpiresAtInput = document.getElementById("announcement-expires-at");
  const saveAnnouncementButton = document.getElementById("save-announcement-button");
  const cancelAnnouncementEditButton = document.getElementById("cancel-announcement-edit");

  // Activity registration modal elements
  const registrationModal = document.getElementById("registration-modal");
  const modalActivityName = document.getElementById("modal-activity-name");
  const signupForm = document.getElementById("signup-form");
  const activityInput = document.getElementById("activity");
  const closeRegistrationModalButton = document.getElementById("close-registration-modal");

  // Search and filter elements
  const searchInput = document.getElementById("activity-search");
  const searchButton = document.getElementById("search-button");
  const categoryFilters = document.querySelectorAll(".category-filter");
  const dayFilters = document.querySelectorAll(".day-filter");
  const timeFilters = document.querySelectorAll(".time-filter");

  // Authentication elements
  const loginButton = document.getElementById("login-button");
  const userInfo = document.getElementById("user-info");
  const displayName = document.getElementById("display-name");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModalButton = document.getElementById("close-login-modal");
  const loginMessage = document.getElementById("login-message");

  const activityTypes = {
    sports: { label: "Sports", color: "#e8f5e9", textColor: "#2e7d32" },
    arts: { label: "Arts", color: "#fff1e6", textColor: "#b04400" },
    academic: { label: "Academic", color: "#e7f0ff", textColor: "#174ea6" },
    community: { label: "Community", color: "#eefbf2", textColor: "#136f3a" },
    technology: { label: "Technology", color: "#f0f4ff", textColor: "#2d4db3" },
  };

  // State
  let allActivities = {};
  let allAnnouncements = [];
  let currentFilter = "all";
  let searchQuery = "";
  let currentDay = "";
  let currentTimeRange = "";
  let currentUser = null;

  const timeRanges = {
    morning: { start: "06:00", end: "08:00" },
    afternoon: { start: "15:00", end: "18:00" },
    weekend: { days: ["Saturday", "Sunday"] },
  };

  function toLocalDateTimeInputValue(isoDate) {
    if (!isoDate) {
      return "";
    }

    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function toIsoOrNull(value) {
    if (!value) {
      return null;
    }

    return new Date(value).toISOString();
  }

  function formatFriendlyDate(dateInput) {
    const date = new Date(dateInput);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function initializeFilters() {
    const activeDayFilter = document.querySelector(".day-filter.active");
    if (activeDayFilter) {
      currentDay = activeDayFilter.dataset.day;
    }

    const activeTimeFilter = document.querySelector(".time-filter.active");
    if (activeTimeFilter) {
      currentTimeRange = activeTimeFilter.dataset.time;
    }
  }

  function checkAuthentication() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
        validateUserSession(currentUser.username);
      } catch (error) {
        console.error("Error parsing saved user", error);
        logout();
      }
    }

    updateAuthBodyClass();
  }

  async function validateUserSession(username) {
    try {
      const response = await fetch(`/auth/check-session?username=${encodeURIComponent(username)}`);

      if (!response.ok) {
        logout();
        return;
      }

      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem("currentUser", JSON.stringify(userData));
      updateAuthUI();
    } catch (error) {
      console.error("Error validating session:", error);
    }
  }

  function updateAuthUI() {
    if (currentUser) {
      loginButton.classList.add("hidden");
      userInfo.classList.remove("hidden");
      displayName.textContent = currentUser.display_name;
      announcementAdminButton.classList.remove("hidden");
    } else {
      loginButton.classList.remove("hidden");
      userInfo.classList.add("hidden");
      displayName.textContent = "";
      announcementAdminButton.classList.add("hidden");
      closeAnnouncementModalHandler();
      resetAnnouncementForm();
    }

    updateAuthBodyClass();
    fetchActivities();
  }

  function updateAuthBodyClass() {
    if (currentUser) {
      document.body.classList.remove("not-authenticated");
    } else {
      document.body.classList.add("not-authenticated");
    }
  }

  async function login(username, password) {
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showLoginMessage(data.detail || "Invalid username or password", "error");
        return false;
      }

      currentUser = data;
      localStorage.setItem("currentUser", JSON.stringify(data));
      updateAuthUI();
      closeLoginModalHandler();
      showMessage(`Welcome, ${currentUser.display_name}!`, "success");
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      showLoginMessage("Login failed. Please try again.", "error");
      return false;
    }
  }

  function logout() {
    currentUser = null;
    localStorage.removeItem("currentUser");
    updateAuthUI();
    showMessage("You have been logged out.", "info");
  }

  function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove("hidden");
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("show");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  }

  function closeLoginModalHandler() {
    loginModal.classList.remove("show");
    setTimeout(() => {
      loginModal.classList.add("hidden");
      loginForm.reset();
    }, 250);
  }

  function openAnnouncementModal() {
    if (!currentUser) {
      showMessage("Please sign in to manage announcements.", "error");
      return;
    }

    announcementModal.classList.remove("hidden");
    announcementModal.classList.add("show");
    announcementFormMessage.classList.add("hidden");
    loadAnnouncementAdminList();
  }

  function closeAnnouncementModalHandler() {
    announcementModal.classList.remove("show");
    setTimeout(() => {
      announcementModal.classList.add("hidden");
    }, 250);
  }

  function showAnnouncementFormMessage(text, type) {
    announcementFormMessage.textContent = text;
    announcementFormMessage.className = `message ${type}`;
    announcementFormMessage.classList.remove("hidden");
  }

  function resetAnnouncementForm() {
    announcementForm.reset();
    announcementIdInput.value = "";
    announcementFormTitle.textContent = "Add New Announcement";
    saveAnnouncementButton.textContent = "Save Announcement";
    cancelAnnouncementEditButton.classList.add("hidden");
  }

  function editAnnouncement(announcement) {
    announcementIdInput.value = announcement.id;
    announcementMessageInput.value = announcement.message;
    announcementStartDateInput.value = toLocalDateTimeInputValue(announcement.start_date);
    announcementExpiresAtInput.value = toLocalDateTimeInputValue(announcement.expires_at);
    announcementFormTitle.textContent = "Edit Announcement";
    saveAnnouncementButton.textContent = "Update Announcement";
    cancelAnnouncementEditButton.classList.remove("hidden");
    announcementFormMessage.classList.add("hidden");
  }

  function renderAnnouncementBanner(announcements) {
    if (!announcements || announcements.length === 0) {
      announcementRegion.innerHTML = "";
      announcementRegion.classList.add("hidden");
      return;
    }

    announcementRegion.classList.remove("hidden");
    announcementRegion.innerHTML = announcements
      .map((announcement) => {
        const startText = announcement.start_date
          ? `Starts ${formatFriendlyDate(announcement.start_date)} · `
          : "";
        const expiresText = `Expires ${formatFriendlyDate(announcement.expires_at)}`;

        return `
          <article class="announcement-banner" role="status">
            <div class="announcement-icon" aria-hidden="true">📢</div>
            <div class="announcement-copy">
              <p>${announcement.message}</p>
              <small>${startText}${expiresText}</small>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function fetchAnnouncements() {
    try {
      const response = await fetch("/announcements");
      const announcements = await response.json();

      if (!response.ok) {
        throw new Error(announcements.detail || "Failed to load announcements");
      }

      renderAnnouncementBanner(announcements);
    } catch (error) {
      console.error("Error loading announcements:", error);
      announcementRegion.classList.add("hidden");
    }
  }

  async function loadAnnouncementAdminList() {
    if (!currentUser) {
      return;
    }

    announcementAdminList.innerHTML = "<p class=\"muted\">Loading announcements...</p>";

    try {
      const response = await fetch(
        `/announcements?include_all=true&teacher_username=${encodeURIComponent(currentUser.username)}`
      );
      const announcements = await response.json();

      if (!response.ok) {
        throw new Error(announcements.detail || "Unable to load announcement list");
      }

      allAnnouncements = announcements;

      if (announcements.length === 0) {
        announcementAdminList.innerHTML = "<p class=\"muted\">No announcements yet. Add the first one.</p>";
        return;
      }

      announcementAdminList.innerHTML = announcements
        .map(
          (announcement) => `
            <article class="announcement-admin-card">
              <p>${announcement.message}</p>
              <small>
                ${announcement.start_date ? `Starts ${formatFriendlyDate(announcement.start_date)} · ` : ""}
                Expires ${formatFriendlyDate(announcement.expires_at)}
              </small>
              <div class="announcement-admin-actions">
                <button class="secondary-button edit-announcement" data-id="${announcement.id}">Edit</button>
                <button class="danger-button delete-announcement" data-id="${announcement.id}">Delete</button>
              </div>
            </article>
          `
        )
        .join("");

      announcementAdminList.querySelectorAll(".edit-announcement").forEach((button) => {
        button.addEventListener("click", () => {
          const selected = allAnnouncements.find((item) => item.id === button.dataset.id);
          if (selected) {
            editAnnouncement(selected);
          }
        });
      });

      announcementAdminList.querySelectorAll(".delete-announcement").forEach((button) => {
        button.addEventListener("click", () => {
          const selected = allAnnouncements.find((item) => item.id === button.dataset.id);
          if (!selected) {
            return;
          }

          showConfirmationDialog(
            "Delete this announcement? This action cannot be undone.",
            () => deleteAnnouncement(selected.id)
          );
        });
      });
    } catch (error) {
      console.error("Error loading announcements for admin:", error);
      announcementAdminList.innerHTML = "<p class=\"muted\">Unable to load announcements right now.</p>";
    }
  }

  async function saveAnnouncement(event) {
    event.preventDefault();

    if (!currentUser) {
      showAnnouncementFormMessage("Please sign in to manage announcements.", "error");
      return;
    }

    const payload = {
      message: announcementMessageInput.value.trim(),
      start_date: toIsoOrNull(announcementStartDateInput.value),
      expires_at: toIsoOrNull(announcementExpiresAtInput.value),
    };

    if (!payload.message) {
      showAnnouncementFormMessage("Message is required.", "error");
      return;
    }

    if (!payload.expires_at) {
      showAnnouncementFormMessage("Expiration date is required.", "error");
      return;
    }

    if (payload.start_date && new Date(payload.expires_at) <= new Date(payload.start_date)) {
      showAnnouncementFormMessage("Expiration date must be after the start date.", "error");
      return;
    }

    const announcementId = announcementIdInput.value;
    const isEditing = Boolean(announcementId);
    const path = isEditing ? `/announcements/${encodeURIComponent(announcementId)}` : "/announcements";
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(
        `${path}?teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showAnnouncementFormMessage(result.detail || "Unable to save announcement.", "error");
        return;
      }

      showAnnouncementFormMessage(
        isEditing ? "Announcement updated successfully." : "Announcement created successfully.",
        "success"
      );
      resetAnnouncementForm();
      await Promise.all([loadAnnouncementAdminList(), fetchAnnouncements()]);
    } catch (error) {
      console.error("Error saving announcement:", error);
      showAnnouncementFormMessage("Unable to save announcement right now.", "error");
    }
  }

  async function deleteAnnouncement(announcementId) {
    if (!currentUser) {
      showAnnouncementFormMessage("Please sign in to manage announcements.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/announcements/${encodeURIComponent(announcementId)}?teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();
      if (!response.ok) {
        showAnnouncementFormMessage(result.detail || "Failed to delete announcement.", "error");
        return;
      }

      showAnnouncementFormMessage("Announcement deleted successfully.", "success");
      resetAnnouncementForm();
      await Promise.all([loadAnnouncementAdminList(), fetchAnnouncements()]);
    } catch (error) {
      console.error("Error deleting announcement:", error);
      showAnnouncementFormMessage("Unable to delete announcement right now.", "error");
    }
  }

  function showLoadingSkeletons() {
    activitiesList.innerHTML = "";

    for (let i = 0; i < 9; i++) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "skeleton-card";
      skeletonCard.innerHTML = `
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div style="margin-top: 8px;">
          <div class="skeleton-line" style="height: 6px;"></div>
          <div class="skeleton-line skeleton-text short" style="height: 8px; margin-top: 3px;"></div>
        </div>
        <div style="margin-top: auto;">
          <div class="skeleton-line" style="height: 24px; margin-top: 8px;"></div>
        </div>
      `;
      activitiesList.appendChild(skeletonCard);
    }
  }

  function formatSchedule(details) {
    if (details.schedule_details) {
      const days = details.schedule_details.days.join(", ");

      const formatTime = (time24) => {
        const [hours, minutes] = time24.split(":").map((num) => parseInt(num, 10));
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
      };

      const startTime = formatTime(details.schedule_details.start_time);
      const endTime = formatTime(details.schedule_details.end_time);

      return `${days}, ${startTime} - ${endTime}`;
    }

    return details.schedule;
  }

  function getActivityType(activityName, description) {
    const name = activityName.toLowerCase();
    const desc = description.toLowerCase();

    if (
      name.includes("soccer") ||
      name.includes("basketball") ||
      name.includes("sport") ||
      name.includes("fitness") ||
      desc.includes("team") ||
      desc.includes("game") ||
      desc.includes("athletic")
    ) {
      return "sports";
    }

    if (
      name.includes("art") ||
      name.includes("music") ||
      name.includes("theater") ||
      name.includes("drama") ||
      desc.includes("creative") ||
      desc.includes("paint")
    ) {
      return "arts";
    }

    if (
      name.includes("science") ||
      name.includes("math") ||
      name.includes("academic") ||
      name.includes("study") ||
      name.includes("olympiad") ||
      desc.includes("learning") ||
      desc.includes("education") ||
      desc.includes("competition")
    ) {
      return "academic";
    }

    if (
      name.includes("volunteer") ||
      name.includes("community") ||
      desc.includes("service") ||
      desc.includes("volunteer")
    ) {
      return "community";
    }

    if (
      name.includes("computer") ||
      name.includes("coding") ||
      name.includes("tech") ||
      name.includes("robotics") ||
      desc.includes("programming") ||
      desc.includes("technology") ||
      desc.includes("digital") ||
      desc.includes("robot")
    ) {
      return "technology";
    }

    return "academic";
  }

  async function fetchActivities() {
    showLoadingSkeletons();

    try {
      const queryParams = [];

      if (currentDay) {
        queryParams.push(`day=${encodeURIComponent(currentDay)}`);
      }

      if (currentTimeRange) {
        const range = timeRanges[currentTimeRange];

        if (currentTimeRange !== "weekend" && range) {
          queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
          queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
        }
      }

      const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const response = await fetch(`/activities${queryString}`);
      const activities = await response.json();

      allActivities = activities;
      displayFilteredActivities();
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function displayFilteredActivities() {
    activitiesList.innerHTML = "";
    const filteredActivities = {};

    Object.entries(allActivities).forEach(([name, details]) => {
      const activityType = getActivityType(name, details.description);

      if (currentFilter !== "all" && activityType !== currentFilter) {
        return;
      }

      if (currentTimeRange === "weekend" && details.schedule_details) {
        const activityDays = details.schedule_details.days;
        const isWeekendActivity = activityDays.some((day) => timeRanges.weekend.days.includes(day));

        if (!isWeekendActivity) {
          return;
        }
      }

      const searchableContent = [
        name.toLowerCase(),
        details.description.toLowerCase(),
        formatSchedule(details).toLowerCase(),
      ].join(" ");

      if (searchQuery && !searchableContent.includes(searchQuery.toLowerCase())) {
        return;
      }

      filteredActivities[name] = details;
    });

    if (Object.keys(filteredActivities).length === 0) {
      activitiesList.innerHTML = `
        <div class="no-results">
          <h4>No activities found</h4>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
      return;
    }

    Object.entries(filteredActivities).forEach(([name, details]) => {
      renderActivityCard(name, details);
    });
  }

  function renderActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    const totalSpots = details.max_participants;
    const takenSpots = details.participants.length;
    const spotsLeft = totalSpots - takenSpots;
    const capacityPercentage = (takenSpots / totalSpots) * 100;
    const isFull = spotsLeft <= 0;

    let capacityStatusClass = "capacity-available";
    if (isFull) {
      capacityStatusClass = "capacity-full";
    } else if (capacityPercentage >= 75) {
      capacityStatusClass = "capacity-near-full";
    }

    const activityType = getActivityType(name, details.description);
    const typeInfo = activityTypes[activityType];
    const formattedSchedule = formatSchedule(details);

    const tagHtml = `
      <span class="activity-tag" style="background-color: ${typeInfo.color}; color: ${typeInfo.textColor}">
        ${typeInfo.label}
      </span>
    `;

    const capacityIndicator = `
      <div class="capacity-container ${capacityStatusClass}">
        <div class="capacity-bar-bg">
          <div class="capacity-bar-fill" style="width: ${capacityPercentage}%"></div>
        </div>
        <div class="capacity-text">
          <span>${takenSpots} enrolled</span>
          <span>${spotsLeft} spots left</span>
        </div>
      </div>
    `;

    activityCard.innerHTML = `
      ${tagHtml}
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p class="tooltip">
        <strong>Schedule:</strong> ${formattedSchedule}
        <span class="tooltip-text">Regular meetings at this time throughout the semester</span>
      </p>
      ${capacityIndicator}
      <div class="participants-list">
        <h5>Current Participants:</h5>
        <ul>
          ${details.participants
            .map(
              (email) => `
            <li>
              ${email}
              ${
                currentUser
                  ? `
                <span class="delete-participant tooltip" data-activity="${name}" data-email="${email}">
                  ✖
                  <span class="tooltip-text">Unregister this student</span>
                </span>
              `
                  : ""
              }
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
      <div class="activity-card-actions">
        ${
          currentUser
            ? `
          <button class="register-button" data-activity="${name}" ${isFull ? "disabled" : ""}>
            ${isFull ? "Activity Full" : "Register Student"}
          </button>
        `
            : `
          <div class="auth-notice">
            Teachers can register students.
          </div>
        `
        }
      </div>
    `;

    const deleteButtons = activityCard.querySelectorAll(".delete-participant");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    if (currentUser) {
      const registerButton = activityCard.querySelector(".register-button");
      if (!isFull) {
        registerButton.addEventListener("click", () => {
          openRegistrationModal(name);
        });
      }
    }

    activitiesList.appendChild(activityCard);
  }

  function openRegistrationModal(activityName) {
    modalActivityName.textContent = activityName;
    activityInput.value = activityName;
    registrationModal.classList.remove("hidden");
    setTimeout(() => {
      registrationModal.classList.add("show");
    }, 10);
  }

  function closeRegistrationModalHandler() {
    registrationModal.classList.remove("show");
    setTimeout(() => {
      registrationModal.classList.add("hidden");
      signupForm.reset();
    }, 250);
  }

  function showConfirmationDialog(message, confirmCallback) {
    let confirmDialog = document.getElementById("confirm-dialog");
    if (!confirmDialog) {
      confirmDialog = document.createElement("div");
      confirmDialog.id = "confirm-dialog";
      confirmDialog.className = "modal hidden";
      confirmDialog.innerHTML = `
        <div class="modal-content">
          <h3>Confirm Action</h3>
          <p id="confirm-message"></p>
          <div class="confirm-actions">
            <button id="cancel-button" class="secondary-button">Cancel</button>
            <button id="confirm-button" class="danger-button">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);
    }

    document.getElementById("confirm-message").textContent = message;
    confirmDialog.classList.remove("hidden");
    setTimeout(() => {
      confirmDialog.classList.add("show");
    }, 10);

    const cancelButton = document.getElementById("cancel-button");
    const confirmButton = document.getElementById("confirm-button");

    const newCancelButton = cancelButton.cloneNode(true);
    const newConfirmButton = confirmButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    newCancelButton.addEventListener("click", () => {
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 250);
    });

    newConfirmButton.addEventListener("click", () => {
      confirmCallback();
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 250);
    });

    confirmDialog.addEventListener("click", (event) => {
      if (event.target === confirmDialog) {
        confirmDialog.classList.remove("show");
        setTimeout(() => {
          confirmDialog.classList.add("hidden");
        }, 250);
      }
    });
  }

  async function handleUnregister(event) {
    if (!currentUser) {
      showMessage("You must be logged in as a teacher to unregister students.", "error");
      return;
    }

    const activity = event.target.dataset.activity;
    const email = event.target.dataset.email;

    showConfirmationDialog(`Are you sure you want to unregister ${email} from ${activity}?`, async () => {
      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}&teacher_username=${encodeURIComponent(currentUser.username)}`,
          {
            method: "POST",
          }
        );

        const result = await response.json();

        if (response.ok) {
          showMessage(result.message, "success");
          fetchActivities();
        } else {
          showMessage(result.detail || "An error occurred", "error");
        }
      } catch (error) {
        showMessage("Failed to unregister. Please try again.", "error");
        console.error("Error unregistering:", error);
      }
    });
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Event listeners
  loginButton.addEventListener("click", openLoginModal);
  logoutButton.addEventListener("click", logout);
  closeLoginModalButton.addEventListener("click", closeLoginModalHandler);

  announcementAdminButton.addEventListener("click", openAnnouncementModal);
  closeAnnouncementModalButton.addEventListener("click", closeAnnouncementModalHandler);
  announcementForm.addEventListener("submit", saveAnnouncement);
  cancelAnnouncementEditButton.addEventListener("click", () => {
    resetAnnouncementForm();
    announcementFormMessage.classList.add("hidden");
  });

  closeRegistrationModalButton.addEventListener("click", closeRegistrationModalHandler);

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModalHandler();
    }

    if (event.target === registrationModal) {
      closeRegistrationModalHandler();
    }

    if (event.target === announcementModal) {
      closeAnnouncementModalHandler();
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await login(username, password);
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showMessage("You must be logged in as a teacher to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activityInput.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}&teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        closeRegistrationModalHandler();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    displayFilteredActivities();
  });

  searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    searchQuery = searchInput.value;
    displayFilteredActivities();
  });

  categoryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      categoryFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.category;
      displayFilteredActivities();
    });
  });

  dayFilters.forEach((button) => {
    button.addEventListener("click", () => {
      dayFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentDay = button.dataset.day;
      fetchActivities();
    });
  });

  timeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      timeFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentTimeRange = button.dataset.time;
      fetchActivities();
    });
  });

  window.activityFilters = {
    setDayFilter: (day) => {
      currentDay = day;
      fetchActivities();
    },
    setTimeRangeFilter: (timeRange) => {
      currentTimeRange = timeRange;
      fetchActivities();
    },
  };

  // Initialize app
  checkAuthentication();
  initializeFilters();
  resetAnnouncementForm();
  fetchAnnouncements();
  fetchActivities();
});document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const registrationModal = document.getElementById("registration-modal");
  const modalActivityName = document.getElementById("modal-activity-name");
  const signupForm = document.getElementById("signup-form");
  const activityInput = document.getElementById("activity");
  const closeRegistrationModal = document.getElementById("close-registration-modal");

  const searchInput = document.getElementById("activity-search");
  const searchButton = document.getElementById("search-button");
  const categoryFilters = document.querySelectorAll(".category-filter");
  const dayFilters = document.querySelectorAll(".day-filter");
  const timeFilters = document.querySelectorAll(".time-filter");

  const loginButton = document.getElementById("login-button");
  const userInfo = document.getElementById("user-info");
  const displayName = document.getElementById("display-name");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModal = document.getElementById("close-login-modal");
  const loginMessage = document.getElementById("login-message");

  const announcementRegion = document.getElementById("announcement-region");
  const announcementAdminButton = document.getElementById("announcement-admin-button");
  const announcementModal = document.getElementById("announcement-modal");
  const closeAnnouncementModal = document.getElementById("close-announcement-modal");
  const announcementAdminList = document.getElementById("announcement-admin-list");
  const announcementForm = document.getElementById("announcement-form");
  const announcementFormTitle = document.getElementById("announcement-form-title");
  const announcementFormMessage = document.getElementById("announcement-form-message");
  const announcementIdInput = document.getElementById("announcement-id");
  const announcementMessageInput = document.getElementById("announcement-message");
  const announcementStartDateInput = document.getElementById("announcement-start-date");
  const announcementExpiresAtInput = document.getElementById("announcement-expires-at");
  const cancelAnnouncementEditButton = document.getElementById("cancel-announcement-edit");

  const activityTypes = {
    sports: { label: "Sports", color: "#e8f5e9", textColor: "#2e7d32" },
    arts: { label: "Arts", color: "#fff3e0", textColor: "#c2410c" },
    academic: { label: "Academic", color: "#e3f2fd", textColor: "#1565c0" },
    community: { label: "Community", color: "#fefce8", textColor: "#854d0e" },
    technology: { label: "Technology", color: "#e8eaf6", textColor: "#3949ab" },
  };

  const timeRanges = {
    morning: { start: "06:00", end: "08:00" },
    afternoon: { start: "15:00", end: "18:00" },
    weekend: { days: ["Saturday", "Sunday"] },
  };

  let allActivities = {};
  let adminAnnouncements = [];
  let currentFilter = "all";
  let searchQuery = "";
  let currentDay = "";
  let currentTimeRange = "";
  let currentUser = null;

  function initializeFilters() {
    const activeDayFilter = document.querySelector(".day-filter.active");
    if (activeDayFilter) {
      currentDay = activeDayFilter.dataset.day;
    }

    const activeTimeFilter = document.querySelector(".time-filter.active");
    if (activeTimeFilter) {
      currentTimeRange = activeTimeFilter.dataset.time;
    }
  }

  function setDayFilter(day) {
    currentDay = day;
    dayFilters.forEach((btn) => btn.classList.toggle("active", btn.dataset.day === day));
    fetchActivities();
  }

  function setTimeRangeFilter(timeRange) {
    currentTimeRange = timeRange;
    timeFilters.forEach((btn) => btn.classList.toggle("active", btn.dataset.time === timeRange));
    fetchActivities();
  }

  function updateAuthBodyClass() {
    document.body.classList.toggle("not-authenticated", !currentUser);
  }

  function updateAuthUI() {
    if (currentUser) {
      loginButton.classList.add("hidden");
      userInfo.classList.remove("hidden");
      displayName.textContent = currentUser.display_name;
      announcementAdminButton.classList.remove("hidden");
    } else {
      loginButton.classList.remove("hidden");
      userInfo.classList.add("hidden");
      displayName.textContent = "";
      announcementAdminButton.classList.add("hidden");
      if (!announcementModal.classList.contains("hidden")) {
        closeAnnouncementModalHandler();
      }
    }

    updateAuthBodyClass();
    fetchActivities();
  }

  function checkAuthentication() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
        validateUserSession(currentUser.username);
      } catch (error) {
        console.error("Error parsing saved user", error);
        logout();
      }
    }

    updateAuthBodyClass();
  }

  async function validateUserSession(username) {
    try {
      const response = await fetch(`/auth/check-session?username=${encodeURIComponent(username)}`);

      if (!response.ok) {
        logout();
        return;
      }

      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem("currentUser", JSON.stringify(userData));
      updateAuthUI();
    } catch (error) {
      console.error("Error validating session:", error);
    }
  }

  async function login(username, password) {
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      const data = await response.json();
      if (!response.ok) {
        showLoginMessage(data.detail || "Invalid username or password", "error");
        return false;
      }

      currentUser = data;
      localStorage.setItem("currentUser", JSON.stringify(data));
      updateAuthUI();
      closeLoginModalHandler();
      showMessage(`Welcome, ${currentUser.display_name}!`, "success");
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      showLoginMessage("Login failed. Please try again.", "error");
      return false;
    }
  }

  function logout() {
    currentUser = null;
    localStorage.removeItem("currentUser");
    updateAuthUI();
    showMessage("You have been logged out.", "info");
  }

  function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove("hidden");
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("show");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  }

  function closeLoginModalHandler() {
    loginModal.classList.remove("show");
    setTimeout(() => {
      loginModal.classList.add("hidden");
      loginForm.reset();
    }, 300);
  }

  function showLoadingSkeletons() {
    activitiesList.innerHTML = "";
    for (let i = 0; i < 9; i += 1) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "skeleton-card";
      skeletonCard.innerHTML = `
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div style="margin-top: 8px;">
          <div class="skeleton-line" style="height: 6px;"></div>
          <div class="skeleton-line skeleton-text short" style="height: 8px; margin-top: 3px;"></div>
        </div>
        <div style="margin-top: auto;">
          <div class="skeleton-line" style="height: 24px; margin-top: 8px;"></div>
        </div>
      `;
      activitiesList.appendChild(skeletonCard);
    }
  }

  function formatSchedule(details) {
    if (details.schedule_details) {
      const days = details.schedule_details.days.join(", ");
      const formatTime = (time24) => {
        const [hours, minutes] = time24.split(":").map((num) => parseInt(num, 10));
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
      };

      const startTime = formatTime(details.schedule_details.start_time);
      const endTime = formatTime(details.schedule_details.end_time);
      return `${days}, ${startTime} - ${endTime}`;
    }

    return details.schedule;
  }

  function getActivityType(activityName, description) {
    const name = activityName.toLowerCase();
    const desc = description.toLowerCase();

    if (
      name.includes("soccer") ||
      name.includes("basketball") ||
      name.includes("sport") ||
      name.includes("fitness") ||
      desc.includes("team") ||
      desc.includes("game") ||
      desc.includes("athletic")
    ) {
      return "sports";
    }

    if (
      name.includes("art") ||
      name.includes("music") ||
      name.includes("theater") ||
      name.includes("drama") ||
      desc.includes("creative") ||
      desc.includes("paint")
    ) {
      return "arts";
    }

    if (
      name.includes("science") ||
      name.includes("math") ||
      name.includes("academic") ||
      name.includes("study") ||
      name.includes("olympiad") ||
      desc.includes("learning") ||
      desc.includes("education") ||
      desc.includes("competition")
    ) {
      return "academic";
    }

    if (
      name.includes("volunteer") ||
      name.includes("community") ||
      desc.includes("service") ||
      desc.includes("volunteer")
    ) {
      return "community";
    }

    if (
      name.includes("computer") ||
      name.includes("coding") ||
      name.includes("tech") ||
      name.includes("robotics") ||
      desc.includes("programming") ||
      desc.includes("technology") ||
      desc.includes("digital") ||
      desc.includes("robot")
    ) {
      return "technology";
    }

    return "academic";
  }

  async function fetchActivities() {
    showLoadingSkeletons();

    try {
      const queryParams = [];
      if (currentDay) {
        queryParams.push(`day=${encodeURIComponent(currentDay)}`);
      }

      if (currentTimeRange) {
        const range = timeRanges[currentTimeRange];
        if (currentTimeRange !== "weekend" && range) {
          queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
          queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
        }
      }

      const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const response = await fetch(`/activities${queryString}`);
      allActivities = await response.json();
      displayFilteredActivities();
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function displayFilteredActivities() {
    activitiesList.innerHTML = "";
    const filteredActivities = {};

    Object.entries(allActivities).forEach(([name, details]) => {
      const activityType = getActivityType(name, details.description);
      if (currentFilter !== "all" && activityType !== currentFilter) {
        return;
      }

      if (currentTimeRange === "weekend" && details.schedule_details) {
        const activityDays = details.schedule_details.days;
        const isWeekendActivity = activityDays.some((day) => timeRanges.weekend.days.includes(day));
        if (!isWeekendActivity) {
          return;
        }
      }

      const searchableContent = [
        name.toLowerCase(),
        details.description.toLowerCase(),
        formatSchedule(details).toLowerCase(),
      ].join(" ");

      if (searchQuery && !searchableContent.includes(searchQuery.toLowerCase())) {
        return;
      }

      filteredActivities[name] = details;
    });

    if (Object.keys(filteredActivities).length === 0) {
      activitiesList.innerHTML = `
        <div class="no-results">
          <h4>No activities found</h4>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
      return;
    }

    Object.entries(filteredActivities).forEach(([name, details]) => {
      renderActivityCard(name, details);
    });
  }

  function renderActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    const totalSpots = details.max_participants;
    const takenSpots = details.participants.length;
    const spotsLeft = totalSpots - takenSpots;
    const capacityPercentage = (takenSpots / totalSpots) * 100;
    const isFull = spotsLeft <= 0;

    let capacityStatusClass = "capacity-available";
    if (isFull) {
      capacityStatusClass = "capacity-full";
    } else if (capacityPercentage >= 75) {
      capacityStatusClass = "capacity-near-full";
    }

    const activityType = getActivityType(name, details.description);
    const typeInfo = activityTypes[activityType];
    const formattedSchedule = formatSchedule(details);

    const tagHtml = `
      <span class="activity-tag" style="background-color: ${typeInfo.color}; color: ${typeInfo.textColor}">
        ${typeInfo.label}
      </span>
    `;

    const capacityIndicator = `
      <div class="capacity-container ${capacityStatusClass}">
        <div class="capacity-bar-bg">
          <div class="capacity-bar-fill" style="width: ${capacityPercentage}%"></div>
        </div>
        <div class="capacity-text">
          <span>${takenSpots} enrolled</span>
          <span>${spotsLeft} spots left</span>
        </div>
      </div>
    `;

    activityCard.innerHTML = `
      ${tagHtml}
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p class="tooltip">
        <strong>Schedule:</strong> ${formattedSchedule}
        <span class="tooltip-text">Regular meetings at this time throughout the semester</span>
      </p>
      ${capacityIndicator}
      <div class="participants-list">
        <h5>Current Participants:</h5>
        <ul>
          ${details.participants
            .map(
              (email) => `
            <li>
              ${email}
              ${
                currentUser
                  ? `
                <span class="delete-participant tooltip" data-activity="${name}" data-email="${email}" role="button" aria-label="Unregister ${email}">
                  ✖
                  <span class="tooltip-text">Unregister this student</span>
                </span>
              `
                  : ""
              }
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
      <div class="activity-card-actions">
        ${
          currentUser
            ? `
          <button class="register-button" data-activity="${name}" ${isFull ? "disabled" : ""}>
            ${isFull ? "Activity Full" : "Register Student"}
          </button>
        `
            : `
          <div class="auth-notice">
            Teachers can register students.
          </div>
        `
        }
      </div>
    `;

    activityCard.querySelectorAll(".delete-participant").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    if (currentUser) {
      const registerButton = activityCard.querySelector(".register-button");
      if (registerButton && !isFull) {
        registerButton.addEventListener("click", () => openRegistrationModal(name));
      }
    }

    activitiesList.appendChild(activityCard);
  }

  function openRegistrationModal(activityName) {
    modalActivityName.textContent = activityName;
    activityInput.value = activityName;
    registrationModal.classList.remove("hidden");
    setTimeout(() => registrationModal.classList.add("show"), 10);
  }

  function closeRegistrationModalHandler() {
    registrationModal.classList.remove("show");
    setTimeout(() => {
      registrationModal.classList.add("hidden");
      signupForm.reset();
    }, 300);
  }

  function toDateTimeLocalValue(dateString) {
    if (!dateString) {
      return "";
    }

    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    const offset = parsed.getTimezoneOffset();
    const localDate = new Date(parsed.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  function formatAnnouncementDateRange(announcement) {
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const start = announcement.start_date ? formatter.format(new Date(announcement.start_date)) : "Now";
    const expires = formatter.format(new Date(announcement.expires_at));
    return `${start} - ${expires}`;
  }

  function renderPublicAnnouncements(announcements) {
    if (!announcements || announcements.length === 0) {
      announcementRegion.classList.add("hidden");
      announcementRegion.innerHTML = "";
      return;
    }

    announcementRegion.classList.remove("hidden");
    announcementRegion.innerHTML = `
      <div class="announcement-shell">
        <h3>
          <span aria-hidden="true">📢</span>
          School Announcements
        </h3>
        <div class="announcement-scroll">
          ${announcements
            .map(
              (announcement) => `
            <article class="announcement-card" role="status">
              <p>${announcement.message}</p>
              <small>Visible: ${formatAnnouncementDateRange(announcement)}</small>
            </article>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  async function fetchPublicAnnouncements() {
    try {
      const response = await fetch("/announcements");
      if (!response.ok) {
        renderPublicAnnouncements([]);
        return;
      }

      const announcements = await response.json();
      renderPublicAnnouncements(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      renderPublicAnnouncements([]);
    }
  }

  function openAnnouncementModal() {
    if (!currentUser) {
      showMessage("Please sign in to manage announcements.", "error");
      return;
    }

    resetAnnouncementForm();
    announcementModal.classList.remove("hidden");
    setTimeout(() => announcementModal.classList.add("show"), 10);
    fetchAdminAnnouncements();
  }

  function closeAnnouncementModalHandler() {
    announcementModal.classList.remove("show");
    setTimeout(() => {
      announcementModal.classList.add("hidden");
      resetAnnouncementForm();
      clearAnnouncementFormMessage();
    }, 300);
  }

  function showAnnouncementFormMessage(text, type) {
    announcementFormMessage.textContent = text;
    announcementFormMessage.className = `message ${type}`;
    announcementFormMessage.classList.remove("hidden");
  }

  function clearAnnouncementFormMessage() {
    announcementFormMessage.textContent = "";
    announcementFormMessage.className = "hidden message";
  }

  function resetAnnouncementForm() {
    announcementForm.reset();
    announcementIdInput.value = "";
    announcementFormTitle.textContent = "Add New Announcement";
    cancelAnnouncementEditButton.classList.add("hidden");
  }

  function renderAnnouncementAdminList() {
    if (adminAnnouncements.length === 0) {
      announcementAdminList.innerHTML = "<p class=\"muted\">No announcements yet. Add one using the form.</p>";
      return;
    }

    announcementAdminList.innerHTML = adminAnnouncements
      .map(
        (announcement) => `
      <article class="announcement-admin-item">
        <p class="announcement-admin-message">${announcement.message}</p>
        <p class="announcement-admin-dates">${formatAnnouncementDateRange(announcement)}</p>
        <div class="announcement-admin-actions">
          <button class="secondary-button edit-announcement" data-id="${announcement.id}">Edit</button>
          <button class="danger-button delete-announcement" data-id="${announcement.id}">Delete</button>
        </div>
      </article>
    `
      )
      .join("");

    announcementAdminList.querySelectorAll(".edit-announcement").forEach((button) => {
      button.addEventListener("click", () => startEditingAnnouncement(button.dataset.id));
    });

    announcementAdminList.querySelectorAll(".delete-announcement").forEach((button) => {
      button.addEventListener("click", () => deleteAnnouncement(button.dataset.id));
    });
  }

  async function fetchAdminAnnouncements() {
    if (!currentUser) {
      return;
    }

    announcementAdminList.innerHTML = "<p class=\"muted\">Loading announcements...</p>";
    try {
      const response = await fetch(
        `/announcements?include_all=true&teacher_username=${encodeURIComponent(currentUser.username)}`
      );

      const data = await response.json();
      if (!response.ok) {
        showAnnouncementFormMessage(data.detail || "Failed to load announcements.", "error");
        return;
      }

      adminAnnouncements = data;
      renderAnnouncementAdminList();
    } catch (error) {
      console.error("Error loading announcements:", error);
      showAnnouncementFormMessage("Failed to load announcements.", "error");
    }
  }

  function startEditingAnnouncement(announcementId) {
    const announcement = adminAnnouncements.find((item) => item.id === announcementId);
    if (!announcement) {
      return;
    }

    announcementIdInput.value = announcement.id;
    announcementMessageInput.value = announcement.message;
    announcementStartDateInput.value = toDateTimeLocalValue(announcement.start_date);
    announcementExpiresAtInput.value = toDateTimeLocalValue(announcement.expires_at);
    announcementFormTitle.textContent = "Edit Announcement";
    cancelAnnouncementEditButton.classList.remove("hidden");
    clearAnnouncementFormMessage();
  }

  function toIsoDateOrNull(value) {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString();
  }

  async function saveAnnouncement(event) {
    event.preventDefault();

    if (!currentUser) {
      showAnnouncementFormMessage("Please sign in to manage announcements.", "error");
      return;
    }

    const payload = {
      message: announcementMessageInput.value.trim(),
      start_date: toIsoDateOrNull(announcementStartDateInput.value),
      expires_at: toIsoDateOrNull(announcementExpiresAtInput.value),
    };

    if (!payload.message || !payload.expires_at) {
      showAnnouncementFormMessage("Message and expiration date are required.", "error");
      return;
    }

    if (payload.start_date && new Date(payload.expires_at) <= new Date(payload.start_date)) {
      showAnnouncementFormMessage("Expiration date must be later than start date.", "error");
      return;
    }

    const editingId = announcementIdInput.value;
    const url = editingId
      ? `/announcements/${encodeURIComponent(editingId)}?teacher_username=${encodeURIComponent(currentUser.username)}`
      : `/announcements?teacher_username=${encodeURIComponent(currentUser.username)}`;
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        showAnnouncementFormMessage(data.detail || "Could not save announcement.", "error");
        return;
      }

      showAnnouncementFormMessage(editingId ? "Announcement updated." : "Announcement added.", "success");
      resetAnnouncementForm();
      await fetchAdminAnnouncements();
      await fetchPublicAnnouncements();
    } catch (error) {
      console.error("Error saving announcement:", error);
      showAnnouncementFormMessage("Could not save announcement.", "error");
    }
  }

  async function deleteAnnouncement(announcementId) {
    if (!currentUser) {
      showAnnouncementFormMessage("Please sign in to manage announcements.", "error");
      return;
    }

    const target = adminAnnouncements.find((item) => item.id === announcementId);
    const preview = target ? target.message.slice(0, 40) : "this announcement";
    showConfirmationDialog(`Delete \"${preview}\"?`, async () => {
      try {
        const response = await fetch(
          `/announcements/${encodeURIComponent(announcementId)}?teacher_username=${encodeURIComponent(currentUser.username)}`,
          { method: "DELETE" }
        );

        const data = await response.json();
        if (!response.ok) {
          showAnnouncementFormMessage(data.detail || "Could not delete announcement.", "error");
          return;
        }

        showAnnouncementFormMessage("Announcement deleted.", "success");
        if (announcementIdInput.value === announcementId) {
          resetAnnouncementForm();
        }
        await fetchAdminAnnouncements();
        await fetchPublicAnnouncements();
      } catch (error) {
        console.error("Error deleting announcement:", error);
        showAnnouncementFormMessage("Could not delete announcement.", "error");
      }
    });
  }

  function showConfirmationDialog(message, confirmCallback) {
    let confirmDialog = document.getElementById("confirm-dialog");
    if (!confirmDialog) {
      confirmDialog = document.createElement("div");
      confirmDialog.id = "confirm-dialog";
      confirmDialog.className = "modal hidden";
      confirmDialog.innerHTML = `
        <div class="modal-content">
          <h3>Confirm Action</h3>
          <p id="confirm-message"></p>
          <div class="confirm-actions">
            <button id="cancel-button" class="secondary-button">Cancel</button>
            <button id="confirm-button" class="danger-button">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);
    }

    const confirmMessage = document.getElementById("confirm-message");
    confirmMessage.textContent = message;

    confirmDialog.classList.remove("hidden");
    setTimeout(() => confirmDialog.classList.add("show"), 10);

    const cancelButton = document.getElementById("cancel-button");
    const confirmButton = document.getElementById("confirm-button");

    const newCancelButton = cancelButton.cloneNode(true);
    const newConfirmButton = confirmButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    newCancelButton.addEventListener("click", () => {
      confirmDialog.classList.remove("show");
      setTimeout(() => confirmDialog.classList.add("hidden"), 300);
    });

    newConfirmButton.addEventListener("click", async () => {
      await confirmCallback();
      confirmDialog.classList.remove("show");
      setTimeout(() => confirmDialog.classList.add("hidden"), 300);
    });
  }

  async function handleUnregister(event) {
    if (!currentUser) {
      showMessage("You must be logged in as a teacher to unregister students.", "error");
      return;
    }

    const activity = event.target.dataset.activity;
    const email = event.target.dataset.email;

    showConfirmationDialog(
      `Are you sure you want to unregister ${email} from ${activity}?`,
      async () => {
        try {
          const response = await fetch(
            `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}&teacher_username=${encodeURIComponent(currentUser.username)}`,
            { method: "POST" }
          );

          const result = await response.json();
          if (response.ok) {
            showMessage(result.message, "success");
            fetchActivities();
          } else {
            showMessage(result.detail || "An error occurred", "error");
          }
        } catch (error) {
          showMessage("Failed to unregister. Please try again.", "error");
          console.error("Error unregistering:", error);
        }
      }
    );
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  loginButton.addEventListener("click", openLoginModal);
  logoutButton.addEventListener("click", logout);
  closeLoginModal.addEventListener("click", closeLoginModalHandler);
  closeRegistrationModal.addEventListener("click", closeRegistrationModalHandler);
  announcementAdminButton.addEventListener("click", openAnnouncementModal);
  closeAnnouncementModal.addEventListener("click", closeAnnouncementModalHandler);
  announcementForm.addEventListener("submit", saveAnnouncement);
  cancelAnnouncementEditButton.addEventListener("click", () => {
    resetAnnouncementForm();
    clearAnnouncementFormMessage();
  });

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModalHandler();
    }

    if (event.target === registrationModal) {
      closeRegistrationModalHandler();
    }

    if (event.target === announcementModal) {
      closeAnnouncementModalHandler();
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await login(username, password);
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showMessage("You must be logged in as a teacher to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activityInput.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}&teacher_username=${encodeURIComponent(currentUser.username)}`,
        { method: "POST" }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        closeRegistrationModalHandler();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    displayFilteredActivities();
  });

  searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    searchQuery = searchInput.value;
    displayFilteredActivities();
  });

  categoryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      categoryFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.category;
      displayFilteredActivities();
    });
  });

  dayFilters.forEach((button) => {
    button.addEventListener("click", () => {
      dayFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentDay = button.dataset.day;
      fetchActivities();
    });
  });

  timeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      timeFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentTimeRange = button.dataset.time;
      fetchActivities();
    });
  });

  window.activityFilters = {
    setDayFilter,
    setTimeRangeFilter,
  };

  checkAuthentication();
  initializeFilters();
  fetchActivities();
  fetchPublicAnnouncements();
});
