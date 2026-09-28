"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LeafState = "base" | "uiux" | "packaging" | "fashion" | "event" | "last";
type ReasonState = "base" | "r1" | "r2" | "r3" | "r4" | "r5";

const pages = ["cover", "disciplines", "reasons", "end", "last"] as const;

type PageTurnState = {
  direction: -1 | 1;
  fromImage: string;
  fromSpread: boolean;
  toImage: string;
  toSpread: boolean;
};

const disciplineImages: Record<LeafState, string> = {
  base: "/figma/disciplines.png",
  uiux: "/figma/discipline-uiux.png",
  packaging: "/figma/discipline-packaging.png",
  fashion: "/figma/discipline-graphics.png",
  event: "/figma/discipline-event.png",
  last: "/figma/discipline-last.png"
};

const reasonImages: Record<ReasonState, string> = {
  base: "/figma/reasons.png",
  r1: "/figma/reason-1.png",
  r2: "/figma/reason-2.png",
  r3: "/figma/reason-3.png",
  r4: "/figma/reason-4.png",
  r5: "/figma/reason-caterpillar.png"
};

const imageByPage = {
  cover: "/figma/cover.png",
  disciplines: disciplineImages.base,
  reasons: reasonImages.base,
  end: "/figma/end-turn.png",
  last: "/figma/end.png"
};

const PAGE_TURN_MS = 900;
const CLOSING_PAGE_TURN_MS = 1160;
const CLOSED_PAGE_TURN_MS = 1420;
const BACKWARD_PAGE_TURN_MS = 580;
const BACKWARD_CLOSED_PAGE_TURN_MS = 660;
const leafSequence: LeafState[] = ["base", "uiux", "event", "packaging", "fashion", "last"];
const reasonSequence: ReasonState[] = ["base", "r1", "r2", "r5", "r4", "r3"];

export default function Home() {
  const [pageIndex, setPageIndex] = useState(0);
  const [leafState, setLeafState] = useState<LeafState>("base");
  const [reasonState, setReasonState] = useState<ReasonState>("base");
  const [pageTurn, setPageTurn] = useState<PageTurnState | null>(null);
  const [bookHoldSide, setBookHoldSide] = useState<"left" | "right" | null>(null);
  const [bookClosing, setBookClosing] = useState(false);
  const turnTimer = useRef<number | null>(null);
  const holdTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const scrollUnlockTimer = useRef<number | null>(null);
  const scrollLocked = useRef(false);
  const page = pages[pageIndex];

  const currentImage = useMemo(() => {
    if (page === "disciplines") return disciplineImages[leafState];
    if (page === "reasons") return reasonImages[reasonState];
    return imageByPage[page];
  }, [leafState, page, reasonState]);

  const go = useCallback((direction: -1 | 1) => {
    if (pageTurn || bookHoldSide || bookClosing) return;

    if (page === "disciplines") {
      const nextLeafIndex = leafSequence.indexOf(leafState) + direction;
      if (nextLeafIndex >= 0 && nextLeafIndex < leafSequence.length) {
        setLeafState(leafSequence[nextLeafIndex]);
        return;
      }
    }

    if (page === "reasons") {
      const nextReasonIndex = reasonSequence.indexOf(reasonState) + direction;
      if (nextReasonIndex >= 0 && nextReasonIndex < reasonSequence.length) {
        setReasonState(reasonSequence[nextReasonIndex]);
        return;
      }
    }

    if ((page === "end" && direction === 1) || (page === "last" && direction === -1)) {
      setPageIndex((current) => current + direction);
      return;
    }

    const nextIndex = Math.max(0, Math.min(pages.length - 1, pageIndex + direction));
    if (nextIndex === pageIndex) return;

    const nextPage = pages[nextIndex];
    const targetLeafState: LeafState = nextPage === "disciplines" && direction === -1 ? "last" : "base";
    const targetReasonState: ReasonState = nextPage === "reasons" && direction === -1 ? "r3" : "base";
    const targetImage =
      nextPage === "disciplines"
        ? disciplineImages[targetLeafState]
        : nextPage === "reasons"
          ? reasonImages[targetReasonState]
          : imageByPage[nextPage];
    setPageTurn({
      direction,
      fromImage: currentImage,
      fromSpread: page === "disciplines" || page === "reasons",
      toImage: targetImage,
      toSpread: nextPage === "disciplines" || nextPage === "reasons"
    });
    setPageIndex(nextIndex);
    setLeafState(targetLeafState);
    setReasonState(targetReasonState);

    const turnDuration = direction === -1
      ? page === "end"
        ? BACKWARD_CLOSED_PAGE_TURN_MS
        : BACKWARD_PAGE_TURN_MS
      : page === "cover" || page === "end"
        ? CLOSED_PAGE_TURN_MS
        : nextPage === "cover" || nextPage === "end"
          ? CLOSING_PAGE_TURN_MS
          : PAGE_TURN_MS;
    turnTimer.current = window.setTimeout(() => {
      setPageTurn(null);
      turnTimer.current = null;

      if (nextPage === "cover" || nextPage === "end") {
        setBookHoldSide(direction === 1 ? "left" : "right");
        holdTimer.current = window.setTimeout(() => {
          setBookHoldSide(null);
          setBookClosing(true);
          holdTimer.current = null;
          closeTimer.current = window.setTimeout(() => {
            setBookClosing(false);
            closeTimer.current = null;
          }, direction === -1 ? 520 : 680);
        }, direction === -1 ? 20 : 80);
      }
    }, turnDuration);
  }, [bookClosing, bookHoldSide, currentImage, leafState, page, pageIndex, pageTurn, reasonState]);

  useEffect(() => {
    Object.values(disciplineImages).forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (turnTimer.current !== null) window.clearTimeout(turnTimer.current);
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      if (scrollUnlockTimer.current !== null) window.clearTimeout(scrollUnlockTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReasonState("base");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 8) return;
      event.preventDefault();
      const direction: -1 | 1 = event.deltaY > 0 ? 1 : -1;

      if (scrollLocked.current) {
        if (direction === 1) {
          if (scrollUnlockTimer.current !== null) window.clearTimeout(scrollUnlockTimer.current);
          scrollUnlockTimer.current = window.setTimeout(() => {
            scrollLocked.current = false;
            scrollUnlockTimer.current = null;
          }, 120);
        }
        return;
      }

      if (scrollUnlockTimer.current !== null) window.clearTimeout(scrollUnlockTimer.current);

      scrollLocked.current = true;
      go(direction);
      scrollUnlockTimer.current = window.setTimeout(() => {
        scrollLocked.current = false;
        scrollUnlockTimer.current = null;
      }, direction === -1 ? 180 : 120);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [go]);

  const isSpread = page === "disciplines" || page === "reasons";

  return (
    <main
      className="stage"
      onClick={() => {
        if (page !== "disciplines" || leafState === "base") return;
        setLeafState("base");
      }}
    >
      <section
        className={`zine ${isSpread ? "open" : "closed"} page${page[0].toUpperCase()}${page.slice(1)} ${page === "last" ? "lastReveal" : ""} ${pageTurn ? "pageTurning" : ""} ${
          pageTurn && !pageTurn.toSpread ? "pageTurningToClosed" : ""
        } ${pageTurn && pageTurn.direction === 1 ? "pageTurningForward" : ""} ${
          pageTurn && pageTurn.direction === -1 ? "pageTurningBackward" : ""
        } ${pageTurn && !pageTurn.toSpread && pageTurn.direction === 1 ? "pageTurningToClosedForward" : ""} ${
          pageTurn && !pageTurn.toSpread && pageTurn.direction === -1 ? "pageTurningToClosedBackward" : ""
        } ${pageTurn && !pageTurn.fromSpread ? "pageTurningFromClosed" : ""} ${
          bookHoldSide ? `bookHoldOpen bookHold${bookHoldSide === "left" ? "Left" : "Right"}` : ""
        } ${bookClosing ? "bookClosing" : ""}`}
        aria-live="polite"
      >
        <div className="fold foldLeft" />
        <div className="fold foldRight" />
        <CrossfadeArt key={page} src={currentImage} animate={page === "disciplines"} />
        {page === "last" && <EndTongue />}
        {pageTurn && <PageTurn turn={pageTurn} />}
        {page === "disciplines" && leafState !== "last" && (
          <div className="hotspotLayer" aria-label="Disciplines">
            <LeafButton className="leaf leafTop" label="UI UX" onClick={() => setLeafState("uiux")} />
            <LeafButton className="leaf leafLeft" label="Event Branding" onClick={() => setLeafState("event")} />
            <LeafButton className="leaf leafBottom" label="Packaging Design" onClick={() => setLeafState("packaging")} />
            <LeafButton className="leaf leafRight" label="Fashion and Graphics" onClick={() => setLeafState("fashion")} />
          </div>
        )}

        {page === "reasons" && (
          <div className="hotspotLayer reasonDismiss" onClick={() => setReasonState("base")} aria-label="Close reason note">
            <ReasonButton className="bug bugOne" label="Reason 1" onClick={() => setReasonState("r1")} />
            <ReasonButton className="bug bugTwo" label="Reason 2" onClick={() => setReasonState("r2")} />
            <ReasonButton className="bug bugThree" label="Reason 3" onClick={() => setReasonState("r5")} />
            <ReasonButton className="bug bugFour" label="Reason 4" onClick={() => setReasonState("r4")} />
            <ReasonButton className="bug bugFive" label="Reason 5" onClick={() => setReasonState("r3")} />
          </div>
        )}
      </section>
    </main>
  );
}

function EndTongue() {
  return (
    <>
      <span className="straightTongue" aria-hidden="true" />
      <img className="endMouthMask" src="/figma/end.png" alt="" draggable={false} aria-hidden="true" />
    </>
  );
}

function PageTurn({ turn }: { turn: PageTurnState }) {
  const isForward = turn.direction === 1;
  const turningSide = isForward ? "right" : "left";
  const revealedSide = isForward ? "left" : "right";
  const staticSide = isForward ? "left" : "right";

  const frontStyle = {
    backgroundImage: `url(${turn.fromImage})`,
    backgroundPosition: turn.fromSpread ? `${turningSide} center` : "center",
    backgroundSize: turn.fromSpread ? "200% 100%" : "100% 100%"
  };
  const backStyle = {
    backgroundImage: `url(${turn.toImage})`,
    backgroundPosition: turn.toSpread ? `${revealedSide} center` : "center",
    backgroundSize: turn.toSpread ? "200% 100%" : "100% 100%"
  };
  const staticStyle = {
    backgroundImage: `url(${turn.fromImage})`,
    backgroundPosition: `${staticSide} center`,
    backgroundSize: "200% 100%"
  };

  return (
    <div className={`pageTurn ${isForward ? "pageTurnForward" : "pageTurnBackward"}`} aria-hidden="true">
      {turn.fromSpread && <div className={`turnStatic turnStatic${isForward ? "Left" : "Right"}`} style={staticStyle} />}
      <div className="turnSheet">
        <div className="turnFace turnFront" style={frontStyle} />
        <div className="turnFace turnBack" style={backStyle} />
      </div>
    </div>
  );
}

function CrossfadeArt({ src, animate }: { src: string; animate: boolean }) {
  const currentSrc = useRef(src);
  const [visibleSrc, setVisibleSrc] = useState(src);
  const [previousSrc, setPreviousSrc] = useState<string | null>(null);

  useEffect(() => {
    if (src === currentSrc.current) return;

    const outgoingSrc = currentSrc.current;
    currentSrc.current = src;

    if (!animate) {
      setPreviousSrc(null);
      setVisibleSrc(src);
      return;
    }

    setPreviousSrc(outgoingSrc);
    setVisibleSrc(src);

    const timeout = window.setTimeout(() => setPreviousSrc(null), 400);
    return () => window.clearTimeout(timeout);
  }, [animate, src]);

  return (
    <>
      {previousSrc && (
        <img className="zineArt zineArtOutgoing" src={previousSrc} alt="" draggable={false} aria-hidden="true" />
      )}
      <img
        key={visibleSrc}
        className={`zineArt ${previousSrc ? "zineArtIncoming" : ""}`}
        src={visibleSrc}
        alt=""
        draggable={false}
      />
    </>
  );
}

function LeafButton({ className, label, onClick }: { className: string; label: string; onClick: () => void }) {
  return (
    <button
      className={className}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
    >
      <span>{label}</span>
    </button>
  );
}

function ReasonButton({ className, label, onClick }: { className: string; label: string; onClick: () => void }) {
  return (
    <button
      className={className}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
    />
  );
}
