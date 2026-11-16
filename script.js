import { servicesCopy } from "./services.js";

document.addEventListener("DOMContentLoaded", () => {
  const intro = document.querySelector("#intro");
  const exploreButton = document.querySelector("#exploreButton");
  const backgroundMusic = document.querySelector("#backgroundMusic");

  function startBackgroundMusic() {
    if (!backgroundMusic) return;

    backgroundMusic.volume = 0.35;

    const playPromise = backgroundMusic.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(error => {
        console.warn("No se pudo reproducir la música:", error);
      });
    }
  }

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const cursorFollower = document.querySelector("#cursorFollower");

  const hasFinePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;

  if (cursorFollower && hasFinePointer && !reduceMotion) {
    let targetX = 0;
    let targetY = 0;

    let currentX = 0;
    let currentY = 0;

    let cursorFrame = null;
    let cursorVisible = false;

    function animateCursor() {
      const ease = 0.16;

      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;

      cursorFollower.style.left = `${currentX}px`;
      cursorFollower.style.top = `${currentY}px`;

      const distanceX = Math.abs(targetX - currentX);
      const distanceY = Math.abs(targetY - currentY);

      if (distanceX > 0.1 || distanceY > 0.1) {
        cursorFrame = requestAnimationFrame(animateCursor);
      } else {
        currentX = targetX;
        currentY = targetY;

        cursorFollower.style.left = `${currentX}px`;
        cursorFollower.style.top = `${currentY}px`;

        cursorFrame = null;
      }
    }

    document.addEventListener("mousemove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;

      if (!cursorVisible) {
        cursorVisible = true;

        currentX = targetX;
        currentY = targetY;

        cursorFollower.style.left = `${currentX}px`;
        cursorFollower.style.top = `${currentY}px`;

        cursorFollower.classList.add("is-visible");
      }

      if (!cursorFrame) {
        cursorFrame = requestAnimationFrame(animateCursor);
      }
    });

    document.addEventListener("mouseleave", () => {
      cursorVisible = false;
      cursorFollower.classList.remove("is-visible");
    });

    window.addEventListener("blur", () => {
      cursorVisible = false;

      cursorFollower.classList.remove("is-visible");

      if (cursorFrame) {
        cancelAnimationFrame(cursorFrame);
        cursorFrame = null;
      }
    });

    if (exploreButton) {
      exploreButton.addEventListener("mouseenter", () => {
        cursorFollower.classList.add("is-hover");

        window.gsap.to(exploreButton, {
          scale: 0.9,
          duration: 0.55,
          ease: "power3.out",
          overwrite: "auto"
        });
      });

      exploreButton.addEventListener("mouseleave", () => {
        cursorFollower.classList.remove("is-hover");

        window.gsap.to(exploreButton, {
          scale: 1,
          duration: 0.65,
          ease: "power3.out",
          overwrite: "auto"
        });
      });
    }
  }

  if (reduceMotion) {
    intro?.remove();

    document.body.classList.remove("intro-locked");

    return;
  }

  if (!window.gsap || !window.ScrollTrigger) {
    document.body.classList.remove("intro-locked");

    if (exploreButton && intro) {
      exploreButton.addEventListener("click", () => {
        startBackgroundMusic();

        intro.remove();

        document.body.classList.remove("intro-locked");

        document.querySelector(".hero-layer-text")
          ?.classList.add("is-revealed");
      });
    }

    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  gsap.registerPlugin(ScrollTrigger);

  document.documentElement.classList.add("js-ready");

  let lenis = null;

  if (window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.15,
      smoothWheel: true,
      touchMultiplier: 1.15,
      wheelMultiplier: 0.9
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }

  gsap.set(".intro-panel", {
    yPercent: 105,
    opacity: 0
  });

  gsap.set(".intro-letter", {
    y: "120%",
    opacity: 0
  });

  gsap.set(
    [
      ".intro-kicker",
      ".intro-title",
      ".explore-button",
      ".intro-top",
      ".intro-bottom"
    ],
    {
      y: 22,
      opacity: 0
    }
  );

  const introTimeline = gsap.timeline({
    defaults: {
      ease: "power3.out"
    }
  });

  introTimeline
    .to(".intro-top, .intro-bottom", {
      y: 0,
      opacity: 1,
      duration: 0.8
    })
    .to(".intro-panel", {
      yPercent: 0,
      opacity: 1,
      duration: 1.25,
      stagger: 0.09
    }, "-=0.45")
    .to(".intro-kicker", {
      y: 0,
      opacity: 1,
      duration: 0.7
    }, "-=0.65")
    .to(".intro-title", {
      y: 0,
      opacity: 1,
      duration: 0.45
    }, "-=0.48")
    .to(".intro-letter", {
      y: "0%",
      opacity: 1,
      duration: 0.7,
      stagger: 0.14,
      ease: "power4.out"
    }, "-=0.20")
    .to(".explore-button", {
      y: 0,
      opacity: 1,
      duration: 0.65
    }, "-=0.45");

  let introFinished = false;

  exploreButton?.addEventListener("click", () => {
    if (introFinished) return;

    introFinished = true;

    exploreButton.disabled = true;

    startBackgroundMusic();

    const exitTimeline = gsap.timeline({
      defaults: {
        ease: "power3.inOut"
      },

      onComplete: () => {
        intro?.remove();

        document.body.classList.remove("intro-locked");

        const heroTextLayer = document.querySelector(
          ".hero-layer-text"
        );

        heroTextLayer?.classList.add("is-revealed");

        ScrollTrigger.refresh();
      }
    });

    exitTimeline
      .to(".intro-center", {
        y: -35,
        opacity: 0,
        duration: 0.45
      })
      .to(".intro-panel", {
        opacity: 0,
        duration: 0.55,
        stagger: 0.095,
        ease: "power2.in"
      }, "-=0.15")
      .to(".intro", {
        yPercent: -100,
        duration: 1.1
      }, "-=0.35");
  });

  if (window.SplitType) {
    document.querySelectorAll(".split-title").forEach((element) => {
      try {
        new window.SplitType(element, {
          types: "lines",
          lineClass: "split-line"
        });
      } catch (error) {
        console.warn("No se pudo dividir el texto:", error);
      }
    });
  }

  gsap.utils.toArray(".reveal").forEach((element) => {
    gsap.fromTo(
      element,
      {
        y: 38,
        autoAlpha: 0
      },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.9,
        ease: "power3.out",

        scrollTrigger: {
          trigger: element,
          start: "top 88%",
          once: true
        }
      }
    );
  });

  const isMobile = window.matchMedia(
    "(max-width: 600px)"
  ).matches;

  gsap.utils.toArray("[data-parallax]").forEach((element) => {
    gsap.fromTo(
      element,
      {
        yPercent: isMobile ? -3 : -7
      },
      {
        yPercent: isMobile ? 3 : 7,
        ease: "none",

        scrollTrigger: {
          trigger: element,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.7
        }
      }
    );
  });

  if (!isMobile) {
    gsap.to(".title-line-accent", {
      x: 65,
      ease: "none",

      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 1
      }
    });
  }

  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const pixelTransition = document.querySelector(
    ".mars-pixel-transition"
  );

  if (!pixelTransition) return;

  const rows = Array.from(
    pixelTransition.querySelectorAll(".mars-pixel-row")
  );

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  let blocksByRow = [];
  let pixelTrigger = null;

  function buildPixels() {
    const cellSize = parseFloat(
      window.getComputedStyle(rows[0]).height
    ) || 40;

    const columns = Math.ceil(
      pixelTransition.clientWidth / cellSize
    ) + 2;

    rows.forEach((row) => {
      row.innerHTML = "";

      for (let i = 0; i < columns; i++) {
        const block = document.createElement("div");

        block.className = "mars-pixel-cell";

        row.appendChild(block);
      }
    });

    blocksByRow = rows.map((row) => {
      const blocks = Array.from(
        row.querySelectorAll(".mars-pixel-cell")
      );

      const order = gsap
        ? gsap.utils.shuffle(
            blocks.map((_, index) => index)
          )
        : blocks.map((_, index) => index);

      const ranks = [];

      order.forEach((blockIndex, rank) => {
        ranks[blockIndex] = rank;
      });

      return {
        blocks,
        ranks
      };
    });
  }

  function updatePixelTransition(progress) {
    const totalRows = blocksByRow.length;

    blocksByRow.forEach((row, rowIndex) => {
      const { blocks, ranks } = row;

      const rowDelay = 0.18 * (totalRows - rowIndex - 1);

      const rowProgress = Math.max(
        0,
        Math.min(
          1,
          (progress - rowDelay) / (1 - rowDelay)
        )
      );

      blocks.forEach((block, index) => {
        const blockProgress = Math.max(
          0,
          Math.min(
            1,
            rowProgress * blocks.length - ranks[index]
          )
        );

        block.style.opacity = blockProgress;
      });
    });
  }

  buildPixels();

  if (
    reduceMotion ||
    !gsap ||
    !ScrollTrigger
  ) {
    pixelTransition
      .querySelectorAll(".mars-pixel-cell")
      .forEach((block) => {
        block.style.opacity = "1";
      });

    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const hero = pixelTransition.closest(".hero");

  if (!hero) return;

  updatePixelTransition(0);

  pixelTrigger = ScrollTrigger.create({
    trigger: hero,
    start: "bottom bottom",
    end: "bottom top",
    scrub: true,

    onUpdate: (self) => {
      updatePixelTransition(self.progress);
    }
  });

  updatePixelTransition(pixelTrigger.progress);

  window.addEventListener("resize", () => {
    buildPixels();

    ScrollTrigger.refresh();

    updatePixelTransition(pixelTrigger.progress);
  }, { passive: true });

  ScrollTrigger.refresh();
});



document.addEventListener("DOMContentLoaded", () => {
  const stickySection = document.querySelector(
    ".mars-services-section"
  );

  if (!stickySection) return;

  const services = Array.from(
    stickySection.querySelectorAll(".mars-service")
  );

  const indicator = stickySection.querySelector(
    ".mars-services-indicator"
  );

  const currentCount = stickySection.querySelector(
    "#mars-current-count"
  );

  const serviceCopyElem = stickySection.querySelector(
    "#mars-service-description"
  );

  const servicePhase = stickySection.querySelector(
    "#mars-service-phase"
  );

  const progressFill = stickySection.querySelector(
    ".mars-services-progress-fill"
  );

  const layout = stickySection.querySelector(
    ".mars-services-layout"
  );

  if (!services.length || !layout) return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const SplitType = window.SplitType;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const getServiceCopy = (index) => {
    return servicesCopy[index]?.[0] ?? "";
  };

  const getServiceLabel = (index) => {
    return services[index]?.textContent.trim() ?? "";
  };


  /* =========================================
     MOBILE CONTENT
     GENERATE ALL FOUR SECTIONS
  ========================================= */

  let mobileContent = stickySection.querySelector(
    ".mars-services-mobile-content"
  );

  if (!mobileContent) {
    mobileContent = document.createElement("div");

    mobileContent.className =
      "mars-services-mobile-content";

    mobileContent.setAttribute(
      "aria-label",
      "Mission information"
    );

    services.forEach((service, index) => {
      const article = document.createElement("article");

      article.className = "mars-service-mobile-card";

      const meta = document.createElement("div");

      meta.className = "mars-service-mobile-meta";

      const number = document.createElement("span");

      number.className = "mars-service-mobile-number";

      number.textContent = String(index + 1).padStart(2, "0");

      const category = document.createElement("span");

      category.className = "mars-service-mobile-category";

      category.textContent = "MISSION PILLAR";

      meta.append(number, category);

      const content = document.createElement("div");

      content.className = "mars-service-mobile-copy";

      const title = document.createElement("h3");

      title.textContent = getServiceLabel(index);

      const description = document.createElement("p");

      description.textContent = getServiceCopy(index);

      content.append(title, description);

      article.append(meta, content);

      mobileContent.appendChild(article);
    });

    layout.insertAdjacentElement(
      "afterend",
      mobileContent
    );
  }


  /* =========================================
     FALLBACK
  ========================================= */

  if (!gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();


  /* =========================================
     DESKTOP
     ORIGINAL STICKY EXPERIENCE
  ========================================= */

  mm.add("(min-width: 901px)", () => {

    let currentIndex = 0;

    let currentTextSplitText = null;

    let textTransitionId = 0;

    const getServiceHeight = () => {
      return services[0].getBoundingClientRect().height;
    };


    /* -----------------------------------------
       INDICATOR POSITION
    ----------------------------------------- */

    const syncLayout = () => {
      const activeService = services[currentIndex];

      if (!activeService) return;

      const serviceHeight = getServiceHeight();

      const listRect = indicator.parentElement.getBoundingClientRect();

      const serviceRect = activeService.getBoundingClientRect();

      const centerX =
        serviceRect.left +
        serviceRect.width / 2 -
        listRect.left;

      gsap.set(indicator, {
        x: centerX,
        xPercent: -50,
        y: currentIndex * serviceHeight,
        width: serviceRect.width
      });
    };


    /* -----------------------------------------
       PROGRESS BAR
    ----------------------------------------- */

    const updateProgressBar = (progress) => {
      gsap.set(progressFill, {
        scaleX: 1,
        scaleY: progress
      });
    };


    /* -----------------------------------------
       TEXT SPLITTING
    ----------------------------------------- */

    const splitCurrentText = () => {
      if (currentTextSplitText) {
        currentTextSplitText.revert();

        currentTextSplitText = null;
      }

      if (!SplitType) return;

      try {
        currentTextSplitText = new SplitType(
          serviceCopyElem,
          {
            types: "lines",
            lineClass: "mars-service-line"
          }
        );
      } catch (error) {
        console.warn(
          "No se pudo dividir el texto:",
          error
        );
      }
    };


    /* -----------------------------------------
       TEXT TRANSITION
    ----------------------------------------- */

    const animateTextChange = (index) => {

      const transitionId = ++textTransitionId;

      if (!SplitType) {
        serviceCopyElem.textContent = getServiceCopy(index);

        return;
      }

      const oldLines = currentTextSplitText?.lines
        ? Array.from(currentTextSplitText.lines)
        : [serviceCopyElem];

      gsap.killTweensOf(oldLines);

      gsap.to(oldLines, {
        opacity: 0,
        y: -12,
        duration: 0.22,
        stagger: 0.015,
        ease: "power2.in",

        onComplete: () => {

          if (transitionId !== textTransitionId) return;

          if (currentTextSplitText) {
            currentTextSplitText.revert();

            currentTextSplitText = null;
          }

          serviceCopyElem.textContent = getServiceCopy(index);

          try {
            currentTextSplitText = new SplitType(
              serviceCopyElem,
              {
                types: "lines",
                lineClass: "mars-service-line"
              }
            );
          } catch (error) {
            console.warn(
              "No se pudo dividir el nuevo texto:",
              error
            );

            return;
          }

          const newLines = currentTextSplitText.lines
            ? Array.from(currentTextSplitText.lines)
            : [serviceCopyElem];

          gsap.fromTo(
            newLines,
            {
              opacity: 0,
              y: 12
            },
            {
              opacity: 1,
              y: 0,
              duration: 0.4,
              stagger: 0.025,
              ease: "power3.out"
            }
          );
        }
      });
    };


    /* -----------------------------------------
       UPDATE ACTIVE SERVICE
    ----------------------------------------- */

    const updateActiveService = (index) => {

      const safeIndex = Math.max(
        0,
        Math.min(services.length - 1, index)
      );

      if (safeIndex === currentIndex) return;

      currentIndex = safeIndex;

      services.forEach((service, serviceIndex) => {

        const isActive = serviceIndex === safeIndex;

        service.classList.toggle("active", isActive);

        service.setAttribute(
          "aria-pressed",
          String(isActive)
        );

      });

      const serviceHeight = getServiceHeight();

      const listRect = indicator.parentElement.getBoundingClientRect();

      const serviceRect = services[safeIndex].getBoundingClientRect();

      const centerX =
        serviceRect.left +
        serviceRect.width / 2 -
        listRect.left;

      gsap.to(indicator, {
        x: centerX,
        xPercent: -50,
        y: safeIndex * serviceHeight,
        width: serviceRect.width,
        duration: 0.5,
        ease: "power3.inOut",
        overwrite: true
      });

      gsap.to(currentCount, {
        innerText: safeIndex + 1,
        snap: {
          innerText: 1
        },
        duration: 0.3,
        ease: "power3.out"
      });

      if (servicePhase) {

        const number = String(safeIndex + 1).padStart(2, "0");

        const label = getServiceLabel(safeIndex);

        servicePhase.textContent =
          `${number} — ${label}`;
      }

      animateTextChange(safeIndex);
    };


    /* -----------------------------------------
       INITIAL STATE
    ----------------------------------------- */

    serviceCopyElem.textContent = getServiceCopy(0);

    currentCount.textContent = "1";

    if (servicePhase) {
      servicePhase.textContent =
        `01 — ${getServiceLabel(0)}`;
    }

    services.forEach((service, index) => {

      const isActive = index === 0;

      service.classList.toggle("active", isActive);

      service.setAttribute(
        "aria-pressed",
        String(isActive)
      );

    });

    splitCurrentText();

    syncLayout();

    updateProgressBar(0);


    /* -----------------------------------------
       DESKTOP SCROLLTRIGGER PIN
    ----------------------------------------- */

    const getViewportHeight = () => {
      return document.documentElement.clientHeight ||
        window.innerHeight;
    };

    const serviceTrigger = ScrollTrigger.create({

      trigger: stickySection,

      start: "top top",

      end: () =>
        `+=${getViewportHeight() * services.length}`,

      pin: true,

      scrub: false,

      anticipatePin: 1,

      invalidateOnRefresh: true,

      onUpdate: (self) => {

        updateProgressBar(self.progress);

        const distanceScrolled = Math.max(
          0,
          self.scroll() - self.start
        );

        const activeIndex = Math.min(
          services.length - 1,
          Math.floor(
            distanceScrolled / getViewportHeight()
          )
        );

        if (activeIndex !== currentIndex) {
          updateActiveService(activeIndex);
        }
      }

    });


    /* -----------------------------------------
       DESKTOP RESIZE
    ----------------------------------------- */

    let resizeFrame = null;

    const handleResize = () => {

      window.cancelAnimationFrame(resizeFrame);

      resizeFrame = window.requestAnimationFrame(() => {

        textTransitionId++;

        gsap.killTweensOf(indicator);

        gsap.killTweensOf(currentCount);

        syncLayout();

        ScrollTrigger.refresh();

        updateProgressBar(serviceTrigger.progress);

      });

    };

    window.addEventListener(
      "resize",
      handleResize,
      { passive: true }
    );


    ScrollTrigger.refresh();


    /* -----------------------------------------
       CLEANUP WHEN LEAVING DESKTOP
    ----------------------------------------- */

    return () => {

      window.removeEventListener(
        "resize",
        handleResize
      );

      window.cancelAnimationFrame(resizeFrame);

      textTransitionId++;

      serviceTrigger.kill();

      if (currentTextSplitText) {
        currentTextSplitText.revert();

        currentTextSplitText = null;
      }

    };

  });


  /* =========================================
     MOBILE
     NO PIN — EDITORIAL EXPERIENCE
  ========================================= */

  mm.add("(max-width: 900px)", () => {

    const mobileCards = mobileContent.querySelectorAll(
      ".mars-service-mobile-card"
    );

    if (reduceMotion) return;


    mobileCards.forEach((card, index) => {

      const paragraph = card.querySelector("p");

      /* ---------------------------------------
         SOFT REVEAL
      --------------------------------------- */

      gsap.fromTo(
        card,
        {
          autoAlpha: 0,
          y: 30
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
          ease: "power3.out",

          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            once: true
          }
        }
      );


      /* ---------------------------------------
         MOBILE TEXT PARALLAX
      --------------------------------------- */

      const direction = index % 2 === 0 ? 12 : -12;

      gsap.fromTo(
        paragraph,
        {
          y: direction
        },
        {
          y: -direction,
          ease: "none",

          scrollTrigger: {
            trigger: card,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8
          }
        }
      );

    });

  });


  /* =========================================
     REFRESH AFTER PAGE LOAD
  ========================================= */

  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  }, { once: true });

});



document.addEventListener("DOMContentLoaded", () => {
  const pixelTransition = document.querySelector(
    ".mars-science-pixel-transition"
  );

  const scienceSection = document.querySelector(
    ".mars-science-section"
  );

  if (!pixelTransition || !scienceSection) return;

  const rows = Array.from(
    pixelTransition.querySelectorAll(".mars-pixel-row")
  );

  if (!rows.length) return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let blocksByRow = [];
  let pixelTrigger = null;
  let resizeFrame = null;

  function buildPixels() {
    const cellSize = parseFloat(
      window.getComputedStyle(rows[0]).height
    ) || 40;

    const columns = Math.ceil(
      pixelTransition.clientWidth / cellSize
    ) + 2;

    rows.forEach((row) => {
      row.innerHTML = "";

      for (let i = 0; i < columns; i++) {
        const block = document.createElement("div");

        block.className = "mars-pixel-cell";

        row.appendChild(block);
      }
    });

    blocksByRow = rows.map((row) => {
      const blocks = Array.from(
        row.querySelectorAll(".mars-pixel-cell")
      );

      const order = gsap
        ? gsap.utils.shuffle(
            blocks.map((_, index) => index)
          )
        : blocks.map((_, index) => index);

      const ranks = [];

      order.forEach((blockIndex, rank) => {
        ranks[blockIndex] = rank;
      });

      return {
        blocks,
        ranks
      };
    });
  }

  function updateSciencePixels(progress) {
    const totalRows = blocksByRow.length;

    blocksByRow.forEach((row, rowIndex) => {
      const { blocks, ranks } = row;

      const rowDelay = 0.18 * (totalRows - rowIndex - 1);

      const rowProgress = Math.max(
        0,
        Math.min(
          1,
          (progress - rowDelay) / (1 - rowDelay)
        )
      );

      blocks.forEach((block, index) => {
        const blockProgress = Math.max(
          0,
          Math.min(
            1,
            rowProgress * blocks.length - ranks[index]
          )
        );

        block.style.opacity = 1 - blockProgress;
      });
    });
  }

  buildPixels();

  if (
    reduceMotion ||
    !gsap ||
    !ScrollTrigger
  ) {
    pixelTransition
      .querySelectorAll(".mars-pixel-cell")
      .forEach((block) => {
        block.style.opacity = "0";
      });

    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  updateSciencePixels(0);

  pixelTrigger = ScrollTrigger.create({
    trigger: scienceSection,
    start: "top bottom",
    end: "top top",
    scrub: true,
    invalidateOnRefresh: true,

    onUpdate: (self) => {
      updateSciencePixels(self.progress);
    }
  });

  updateSciencePixels(pixelTrigger.progress);

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(resizeFrame);

    resizeFrame = window.requestAnimationFrame(() => {
      buildPixels();

      ScrollTrigger.refresh();

      updateSciencePixels(pixelTrigger.progress);
    });
  }, { passive: true });

  ScrollTrigger.refresh();
});


document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector(".mars-world-section");

  if (!section) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion) return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  const revealElements = section.querySelectorAll(
    "[data-mars-reveal]"
  );

  const parallaxElements = section.querySelectorAll(
    "[data-mars-parallax]"
  );

  if (gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    revealElements.forEach((element) => {
      gsap.fromTo(
        element,
        {
          autoAlpha: 0,
          y: 32
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
          ease: "power3.out",

          scrollTrigger: {
            trigger: element,
            start: "top 88%",
            once: true
          }
        }
      );
    });

    parallaxElements.forEach((element) => {
      const movement = Number(
        element.dataset.marsParallax
      ) || 0;

      gsap.to(element, {
        y: movement,
        ease: "none",

        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2
        }
      });
    });
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.style.transition =
            "opacity 0.8s ease, transform 0.8s ease";

          entry.target.style.opacity = "1";

          entry.target.style.transform =
            "translateY(0)";

          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12
      }
    );

    revealElements.forEach((element) => {
      element.style.opacity = "0";

      element.style.transform = "translateY(32px)";

      observer.observe(element);
    });
  }
});