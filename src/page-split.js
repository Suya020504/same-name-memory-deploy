(function () {
  var mapUrl = "/map.html";

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = target.tagName || "";
    return /INPUT|TEXTAREA|SELECT/.test(tag) || target.isContentEditable;
  }

  function goToMap(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    window.location.href = mapUrl;
  }

  function slideCountText() {
    var counter = document.getElementById("slideCounter");
    return counter ? counter.textContent || "" : "";
  }

  function isLastSlide() {
    var text = slideCountText();
    var match = text.match(/(\d+)\s*\/\s*(\d+)/);
    return !!match && match[1] === match[2];
  }

  function bootPresentationOnly() {
    document.body.classList.add("presentation-only");

    var imageDeck = document.getElementById("imageSlideDeck");
    if (imageDeck) {
      imageDeck.hidden = true;
      imageDeck.setAttribute("aria-hidden", "true");
    }

    var mapMode = document.getElementById("mapMode");
    if (mapMode) {
      mapMode.classList.remove("visible");
      mapMode.hidden = true;
      mapMode.setAttribute("aria-hidden", "true");
    }

    var slideMode = document.getElementById("slideMode");
    if (slideMode) {
      slideMode.classList.remove("hidden");
      slideMode.removeAttribute("hidden");
      slideMode.setAttribute("aria-hidden", "false");
    }

    var mapTop = document.getElementById("mapTop");
    if (mapTop) {
      mapTop.textContent = "지도 페이지";
      mapTop.setAttribute("type", "button");
    }

    window.enterMapMode = goToMap;
    window.scrollToMap = goToMap;

    document.addEventListener("click", function (event) {
      var target = event.target.closest("#mapTop, #imageDeckMapEnter, [data-action='map']");
      if (target) {
        goToMap(event);
        return;
      }

      if (event.target.closest("#nextBottom") && isLastSlide()) {
        goToMap(event);
      }
    }, true);

    document.addEventListener("keydown", function (event) {
      if (isTypingTarget(document.activeElement)) return;
      if (event.key === "m" || event.key === "M") {
        goToMap(event);
      }
      if ((event.key === "ArrowRight" || event.key === " ") && isLastSlide()) {
        goToMap(event);
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPresentationOnly);
  } else {
    bootPresentationOnly();
  }
})();
