(() => {
  "use strict";
  const root = document.documentElement;
  const themeButton = document.querySelector(".theme-toggle");
  const updateThemeLabel = () => {
    const dark = root.dataset.theme === "dark";
    themeButton.setAttribute(
      "aria-label",
      dark ? "Switch to light theme" : "Switch to dark theme",
    );
    themeButton.title = dark ? "Switch to light theme" : "Switch to dark theme";
  };
  updateThemeLabel();
  themeButton.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("kh-theme", next);
    } catch (_) {
      /* Storage can be disabled. */
    }
    updateThemeLabel();
  });
  const preferredTheme = matchMedia("(prefers-color-scheme: dark)");
  preferredTheme.addEventListener("change", (event) => {
    let saved = null;
    try {
      saved = localStorage.getItem("kh-theme");
    } catch (_) {
      /* Use device preference. */
    }
    if (!saved) {
      root.dataset.theme = event.matches ? "dark" : "light";
      updateThemeLabel();
    }
  });

  const nav = document.querySelector(".desktop-nav");
  const menuButton = document.querySelector(".menu-toggle");
  const closeMenu = () => {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
  };
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    nav.classList.toggle("open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
  });
  nav
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("open")) {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) closeMenu();
  });
  matchMedia("(min-width: 581px)").addEventListener("change", (event) => {
    if (event.matches) closeMenu();
  });

  const filters = [...document.querySelectorAll("[data-filter]")];
  const papers = [...document.querySelectorAll(".publication")];
  const search = document.querySelector("#paper-search");
  const status = document.querySelector(".filter-status");
  const noResults = document.querySelector(".no-results");
  let category = "all";
  const searchablePapers = papers.map((paper) => ({
    paper,
    text: paper.textContent.toLocaleLowerCase(),
  }));
  const filterPapers = () => {
    const query = search.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const { paper, text } of searchablePapers) {
      const visible =
        (category === "all" || paper.dataset.category === category) &&
        text.includes(query);
      paper.hidden = !visible;
      if (visible) count++;
    }
    filters.forEach((button) => {
      const active = button.dataset.filter === category;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    status.textContent = `${count} ${count === 1 ? "publication" : "publications"} shown`;
    noResults.hidden = count !== 0;
  };
  filters.forEach((button) =>
    button.addEventListener("click", () => {
      category = button.dataset.filter;
      filterPapers();
    }),
  );
  search.addEventListener("input", filterPapers);
  document.querySelectorAll("[data-topic-link]").forEach((link) =>
    link.addEventListener("click", () => {
      category = link.dataset.topicLink;
      search.value = "";
      filterPapers();
    }),
  );
  // Navigation to the full list should restore it after using a topic shortcut.
  nav.querySelector('a[href="#publications"]').addEventListener("click", () => {
    category = "all";
    search.value = "";
    filterPapers();
  });
  filterPapers();

  // Mark the nearest section above the reading position, including between sections.
  const navLinks = [...nav.querySelectorAll("a")];
  const sections = navLinks.map((link) => ({
    link,
    section: document.querySelector(link.getAttribute("href")),
  }));
  let framePending = false;
  const updateNavigation = () => {
    let current = sections[0];
    for (const item of sections)
      if (item.section.getBoundingClientRect().top <= 180) current = item;
    for (const item of sections) {
      item.link.classList.toggle("active", item === current);
      if (item === current) item.link.setAttribute("aria-current", "location");
      else item.link.removeAttribute("aria-current");
    }
    framePending = false;
  };
  addEventListener(
    "scroll",
    () => {
      if (!framePending) {
        requestAnimationFrame(updateNavigation);
        framePending = true;
      }
    },
    { passive: true },
  );
  updateNavigation();
})();

(() => {
  const switcher = document.querySelector(".project-switch");
  const buttons = [...switcher.querySelectorAll("button")];
  const panels = [...document.querySelectorAll(".project-panel")];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let activePanel;
  let visible = false;
  function syncPlayback() {
    const video = activePanel.querySelector("video");
    if (!video) return;
    if (visible && !document.hidden) {
      if (!video.hasAttribute("src")) video.src = video.dataset.preview;
      if (!reducedMotion.matches && !video.dataset.manualPause)
        video.play().catch(() => {});
    } else {
      video.pause();
    }
  }
  function selectProject(button) {
    buttons.forEach((item) =>
      item.setAttribute("aria-pressed", String(item === button)),
    );
    activePanel = document.getElementById(button.getAttribute("aria-controls"));
    panels.forEach((panel) => {
      panel.hidden = panel !== activePanel;
      if (panel.hidden) panel.querySelector("video")?.pause();
    });
    syncPlayback();
  }
  buttons.forEach((button) =>
    button.addEventListener("click", () => selectProject(button)),
  );
  selectProject(buttons[0]);
  switcher.hidden = false;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  }).observe(document.querySelector(".featured-section"));
  document.addEventListener("visibilitychange", syncPlayback);
  panels.forEach((panel) => {
    const video = panel.querySelector("video");
    if (!video) return;
    video.addEventListener("pause", () => {
      if (!panel.hidden && visible && !document.hidden)
        video.dataset.manualPause = "true";
    });
    video.addEventListener("play", () => {
      delete video.dataset.manualPause;
    });
  });
})();

// Size the news viewport to five complete entries, including wrapped lines.
const newsList = document.querySelector(".news-list");
if (newsList.children.length > 5 && "ResizeObserver" in window) {
  const recentNews = Array.from(newsList.children).slice(0, 5);
  const observer = new ResizeObserver(() => {
    const height = recentNews.reduce(
      (sum, item) => sum + item.getBoundingClientRect().height,
      newsList.clientTop,
    );
    newsList.style.setProperty("--news-height", height + "px");
  });
  recentNews.forEach((item) => observer.observe(item));
}
