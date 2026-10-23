// CS2Wordle — a daily Wordle-style game.
// Every answer starts with "CS2", which is already filled in.

const PREFIX = "CS2";
const MAX_GUESSES = 8;
const STORAGE_KEY = "cs2wordle-daily";

// Score a guess against the answer (both already upper-cased).
// Lengths may differ. Returns one of "correct" | "present" | "absent" per
// guess character, handling repeated letters the same way Wordle does.
function scoreGuess(guess, answer) {
  const result = new Array(guess.length).fill("absent");
  const remaining = {};

  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
    } else {
      remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    const ch = guess[i];
    if (remaining[ch] > 0) {
      result[i] = "present";
      remaining[ch]--;
    }
  }

  return result;
}

// Position of a calendar date in the word list, counting days as if every
// year were a leap year, so each date keeps the same word every year.
function dayIndex(date) {
  const start = Date.UTC(2000, 0, 1);
  const day = Date.UTC(2000, date.getMonth(), date.getDate());
  return Math.round((day - start) / 86400000);
}

function dailyAnswer(date, words) {
  const w = words[dayIndex(date)];
  return PREFIX + w[0].toUpperCase() + w.slice(1);
}

function dateKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join("-");
}

if (typeof module !== "undefined") {
  module.exports = { PREFIX, MAX_GUESSES, scoreGuess, dayIndex, dailyAnswer };
}


if (typeof document !== "undefined") {
  const boardEl = document.getElementById("board");
  const keyboardEl = document.getElementById("keyboard");
  const toastEl = document.getElementById("toast");
  const dateEl = document.getElementById("date");
  const resultEl = document.getElementById("result");
  const resultTitleEl = document.getElementById("result-title");
  const resultMsgEl = document.getElementById("result-msg");
  const countdownEl = document.getElementById("countdown");
  const helpEl = document.getElementById("help");
  const peekEl = document.getElementById("peek");
  const HELP_SEEN_KEY = "cs2wordle-help-seen";

  // A page can lock the answer by setting window.FIXED_ANSWER first.
  // Such a page doesn't save progress, so it starts fresh on every visit.
  const fixedAnswer = window.FIXED_ANSWER || null;

  const KEY_ROWS = [
    "1234567890".split(""),
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    ["ENTER", ..."ZXCVBNM".split(""), "BACK"],
  ];
  const RANK = { absent: 1, present: 2, correct: 3 };
  const BACKSPACE_ICON =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m16 9-5 6m0-6 5 6"/></svg>';

  let today = "";
  let answer = "";
  let answerDisplay = "";
  let guesses = []; // [{ text, score }], text includes the prefix
  let current = ""; // what the player typed after the prefix
  let over = false;
  let won = false;
  let keyStatus = {};
  let toastTimer = null;

  // Secret code: typing these keys in a row shows the answer for 5 seconds.
  const PEEK_CODE = "WILL2TUFF";
  let recentKeys = []; // [{ ch, before }]: key pressed and the row before it
  let peekTimer = null;

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.date === today && Array.isArray(saved.guesses)) return saved.guesses;
    } catch (e) {}
    return [];
  }

  function save() {
    if (fixedAnswer) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: today, guesses: guesses.map((g) => g.text) })
      );
    } catch (e) {}
  }

  function startDay() {
    const now = new Date();
    today = dateKey(now);
    answerDisplay = fixedAnswer || dailyAnswer(now, DAILY_WORDS);
    answer = answerDisplay.toUpperCase();
    dateEl.textContent = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    guesses = [];
    current = "";
    over = false;
    won = false;
    keyStatus = {};
    showToast("");
    for (const text of fixedAnswer ? [] : load()) record(String(text).toUpperCase());
    showResult();
    render();
  }

  // Short message that floats over the top of the board, then fades.
  function showToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.toggle("show", !!msg);
    if (msg) toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
  }

  // Add a guess to the board and work out whether the game is over.
  function record(text) {
    if (over) return;
    const score = scoreGuess(text, answer);
    guesses.push({ text, score });
    // Colour the keyboard from what the player typed, not the fixed prefix.
    for (let i = PREFIX.length; i < text.length; i++) {
      const ch = text[i];
      if ((RANK[score[i]] || 0) > (RANK[keyStatus[ch]] || 0)) keyStatus[ch] = score[i];
    }
    if (text === answer) {
      over = won = true;
    } else if (guesses.length >= MAX_GUESSES) {
      over = true;
    }
  }

  // The card above the board once the day's game is finished.
  function showResult() {
    resultEl.hidden = !over;
    if (!over) return;
    resultEl.classList.toggle("lost", !won);
    resultTitleEl.textContent = won
      ? ["Ace!", "Clutch!", "Nice one!", "Good round!", "Got there!", "Close call!", "Phew!", "Last round!"][guesses.length - 1]
      : "Round lost";
    resultMsgEl.textContent = won
      ? `You got ${answerDisplay} in ${guesses.length}/${MAX_GUESSES}.`
      : `The word was ${answerDisplay}.`;
    updateCountdown();
    sizeTiles(); // the card takes room from the board
  }

  function updateCountdown() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const s = Math.max(0, Math.floor((midnight - now) / 1000));
    const pad = (n) => String(n).padStart(2, "0");
    countdownEl.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  }

  function tile(ch, cls) {
    const el = document.createElement("div");
    el.className = "tile " + cls;
    el.textContent = ch;
    return el;
  }

  // Size boxes so the widest row fits across the screen, and so all rows
  // fit down the board, but never smaller than 44px for height alone (the
  // board scrolls instead).
  function sizeTiles() {
    const widest = Math.max(5, answer.length, ...guesses.map((g) => g.text.length));
    const rows = over ? guesses.length : MAX_GUESSES;
    const cs = getComputedStyle(boardEl);
    const gap = parseFloat(cs.rowGap) || 5;
    const room = boardEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    // rows + 1 gaps: between rows, plus around the two centring spacers.
    const fitHeight = Math.max(44, Math.floor((room - (rows + 1) * gap) / rows));
    boardEl.style.setProperty(
      "--tile",
      `min(56px, ${fitHeight}px, calc((100vw - 32px - ${widest - 1} * var(--gap)) / ${widest}))`
    );
  }

  // anim: "add" pops the newest box, "reveal" flips the last submitted row.
  function render(anim) {
    boardEl.textContent = "";

    guesses.forEach((g, r) => {
      const row = document.createElement("div");
      row.className = "row";
      const revealing = anim === "reveal" && r === guesses.length - 1;
      [...g.text].forEach((ch, i) => {
        const t = tile(ch, g.score[i]);
        if (revealing) {
          t.classList.add("reveal");
          t.style.animationDelay = i * 90 + "ms";
          // Winning row: each box also hops once all the flips are done.
          if (won) {
            t.classList.add("win");
            t.style.animationDelay = `${i * 90}ms, ${g.text.length * 90 + 250 + i * 70}ms`;
          }
        }
        row.appendChild(t);
      });
      boardEl.appendChild(row);
    });

    if (!over) {
      // Current row: the fixed prefix, typed letters, then empty boxes up
      // to the answer's length.
      const row = document.createElement("div");
      row.className = "row current";
      for (const ch of PREFIX) row.appendChild(tile(ch, "correct"));
      [...current].forEach((ch, i) => {
        const t = tile(ch, "filled");
        if (anim === "add" && i === current.length - 1) t.classList.add("pop");
        row.appendChild(t);
      });
      for (let i = PREFIX.length + current.length; i < answer.length; i++) {
        row.appendChild(tile("", "empty"));
      }
      boardEl.appendChild(row);

      // Remaining guesses: empty rows the length of the answer.
      for (let r = guesses.length + 1; r < MAX_GUESSES; r++) {
        const row = document.createElement("div");
        row.className = "row";
        for (let i = 0; i < answer.length; i++) row.appendChild(tile("", "empty"));
        boardEl.appendChild(row);
      }
    }

    renderKeyboard();
    sizeTiles(); // after the keyboard exists, so the board's room is known

    // Keep the row being typed (or the final row) in view.
    const focusRow = boardEl.querySelector(".row.current") || boardEl.lastElementChild;
    if (focusRow) focusRow.scrollIntoView({ block: "nearest" });
  }

  function renderKeyboard() {
    keyboardEl.textContent = "";
    for (const keys of KEY_ROWS) {
      const row = document.createElement("div");
      row.className = "kb-row";
      for (const k of keys) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "key";
        btn.dataset.key = k;
        if (k === "ENTER") {
          btn.classList.add("wide");
          btn.textContent = "Enter";
        } else if (k === "BACK") {
          btn.classList.add("wide");
          btn.innerHTML = BACKSPACE_ICON;
          btn.setAttribute("aria-label", "Backspace");
        } else {
          btn.textContent = k;
          if (keyStatus[k]) btn.classList.add(keyStatus[k]);
        }
        row.appendChild(btn);
      }
      keyboardEl.appendChild(row);
    }
  }

  function shakeCurrentRow() {
    const row = boardEl.querySelector(".row.current");
    if (!row) return;
    row.classList.remove("shake");
    void row.offsetWidth; // restart the animation
    row.classList.add("shake");
  }

  function addChar(ch) {
    if (over || PREFIX.length + current.length >= answer.length) return;
    current += ch;
    render("add");
  }

  function removeChar() {
    if (over || !current) return;
    current = current.slice(0, -1);
    render();
  }

  function submit() {
    if (over) return;
    if (PREFIX.length + current.length < answer.length) {
      showToast("Not enough letters");
      shakeCurrentRow();
      return;
    }
    record(PREFIX + current);
    current = "";
    save();
    render("reveal");
    // Show the result card once the row has finished flipping.
    if (over) setTimeout(showResult, answer.length * 90 + (won ? 1100 : 500));
  }

  function handleKey(k) {
    if (k === "ENTER") submit();
    else if (k === "BACK") removeChar();
    else if (/^[A-Z0-9]$/.test(k)) {
      recentKeys.push({ ch: k, before: current });
      if (recentKeys.length > PEEK_CODE.length) recentKeys.shift();
      addChar(k);
      if (recentKeys.map((r) => r.ch).join("") === PEEK_CODE) {
        // Undo the code's letters in the row, then show the answer.
        if (!over) current = recentKeys[0].before;
        recentKeys = [];
        render();
        showPeek();
      }
      return;
    }
    recentKeys = [];
  }

  function showPeek() {
    clearTimeout(peekTimer);
    peekEl.textContent = "";
    const label = document.createElement("span");
    label.className = "peek-label";
    label.textContent = "Today's word";
    const word = document.createElement("strong");
    word.textContent = answerDisplay;
    peekEl.append(label, word);
    peekEl.classList.add("show");
    peekTimer = setTimeout(() => peekEl.classList.remove("show"), 5000);
  }

  keyboardEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".key");
    if (btn) {
      handleKey(btn.dataset.key);
      btn.blur();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (helpEl.open || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleKey("ENTER");
    } else if (e.key === "Backspace") {
      handleKey("BACK");
    } else if (e.key.length === 1) {
      handleKey(e.key.toUpperCase());
    }
  });

  // How-to-play dialog: opens from the ? button, and on a first visit.
  document.getElementById("help-btn").addEventListener("click", () => helpEl.showModal());
  helpEl.addEventListener("click", (e) => {
    if (e.target === helpEl || e.target.closest("[data-close]")) helpEl.close();
  });
  helpEl.addEventListener("close", () => {
    // Don't leave focus on a button, or Space/Enter would press it mid-game.
    document.activeElement.blur();
    try {
      localStorage.setItem(HELP_SEEN_KEY, "1");
    } catch (e) {}
  });

  window.addEventListener("resize", sizeTiles);
  // Web fonts can change the header's height slightly once they load.
  if (document.fonts) document.fonts.ready.then(sizeTiles);

  // If the page stays open past midnight, switch to the new day's word.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && dateKey(new Date()) !== today) startDay();
  });
  setInterval(() => {
    if (dateKey(new Date()) !== today) startDay();
    else if (over) updateCountdown();
  }, 1000);

  startDay();

  let helpSeen = false;
  try {
    helpSeen = localStorage.getItem(HELP_SEEN_KEY) === "1";
  } catch (e) {}
  if (!helpSeen) helpEl.showModal();
}
