(function () {
  var LAST_PRESENTATION_SLIDE = 10;

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = target.tagName || "";
    return /INPUT|TEXTAREA|SELECT/.test(tag) || target.isContentEditable;
  }

  function stopMapEntry(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function deckCountText() {
    var counter = document.getElementById("imageDeckCounter");
    return counter ? counter.textContent || "" : "";
  }

  function deckIndex() {
    var text = deckCountText();
    var match = text.match(/(\d+)\s*\/\s*(\d+)/);
    return match ? Number(match[1]) : 1;
  }

  function tenthDot() {
    return document.querySelectorAll("#imageDeckDots .image-deck-dot")[LAST_PRESENTATION_SLIDE - 1] || null;
  }

  function clampToPresentationSlides(event) {
    var index = deckIndex();
    if (index >= LAST_PRESENTATION_SLIDE) {
      stopMapEntry(event);
      return true;
    }
    return false;
  }

  function normalizeDeck() {
    var counter = document.getElementById("imageDeckCounter");
    var dots = document.querySelectorAll("#imageDeckDots .image-deck-dot");
    var stage = document.querySelector("#imageSlideDeck .image-slide-stage");
    var img = document.getElementById("imageDeckSlideImage");
    var mapCta = document.getElementById("imageDeckMapCta");

    dots.forEach(function (dot, index) {
      dot.hidden = index >= LAST_PRESENTATION_SLIDE;
      dot.setAttribute("aria-hidden", index >= LAST_PRESENTATION_SLIDE ? "true" : "false");
    });

    if (mapCta) {
      mapCta.hidden = true;
      mapCta.setAttribute("aria-hidden", "true");
    }

    if (stage) {
      stage.classList.remove("show-map-cta");
    }

    if (deckIndex() > LAST_PRESENTATION_SLIDE) {
      var dot = tenthDot();
      if (dot) {
        dot.click();
      }
    }

    if (img && deckIndex() <= LAST_PRESENTATION_SLIDE) {
      img.hidden = false;
    }

    if (counter) {
      var current = Math.min(deckIndex(), LAST_PRESENTATION_SLIDE);
      var label = String(current).padStart(2, "0") + " / " + LAST_PRESENTATION_SLIDE;
      if (counter.textContent !== label) {
        counter.textContent = label;
      }
    }
  }

  function bootPresentationOnly() {
    document.body.classList.add("presentation-only");

    var imageDeck = document.getElementById("imageSlideDeck");
    if (imageDeck) {
      imageDeck.hidden = false;
      imageDeck.setAttribute("aria-hidden", "false");
    }

    var mapMode = document.getElementById("mapMode");
    if (mapMode) {
      mapMode.classList.remove("visible");
      mapMode.hidden = true;
      mapMode.setAttribute("aria-hidden", "true");
    }

    var slideMode = document.getElementById("slideMode");
    if (slideMode) {
      slideMode.classList.add("hidden");
      slideMode.hidden = true;
      slideMode.setAttribute("aria-hidden", "true");
    }

    var skip = document.getElementById("imageDeckSkipToMap");
    if (skip) {
      skip.hidden = true;
      skip.setAttribute("aria-hidden", "true");
    }

    window.enterMapMode = stopMapEntry;
    window.scrollToMap = stopMapEntry;

    normalizeDeck();

    var counter = document.getElementById("imageDeckCounter");
    if (counter) {
      new MutationObserver(normalizeDeck).observe(counter, { childList: true, characterData: true, subtree: true });
    }

    var dots = document.getElementById("imageDeckDots");
    if (dots) {
      new MutationObserver(normalizeDeck).observe(dots, { childList: true, subtree: true });
    }

    document.addEventListener("click", function (event) {
      var target = event.target.closest("#mapTop, #imageDeckMapEnter, #imageDeckSkipToMap, [data-action='map']");
      if (target) {
        stopMapEntry(event);
        return;
      }

      if (event.target.closest("#imageDeckNext")) {
        clampToPresentationSlides(event);
      }
    }, true);

    window.addEventListener("keydown", function (event) {
      if (isTypingTarget(document.activeElement)) return;
      if (event.key === "m" || event.key === "M" || event.key === "Enter") {
        stopMapEntry(event);
      }
      if ((event.key === "ArrowRight" || event.key === " ") && clampToPresentationSlides(event)) {
        return;
      }
      if (event.key === "End") {
        stopMapEntry(event);
        var dot = tenthDot();
        if (dot) {
          dot.click();
        }
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPresentationOnly);
  } else {
    bootPresentationOnly();
  }
})();
