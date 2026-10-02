// CS2Wordle — a Wordle-style game where the answer length is hidden.

const ANSWERS = [
  "CS250",
  "CS2Shifty",
  "CS2Shitty",
  "ZestyCS",
  "CS2Smelly",
];

const MAX_GUESSES = 8;
// Longer than any answer, so the cap doesn't give the length away.
const MAX_LENGTH = 12;

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

if (typeof module !== "undefined") {
  module.exports = { ANSWERS, MAX_GUESSES, MAX_LENGTH, scoreGuess };
}

if (typeof document !== "undefined") {
  const boardEl = document.getElementById("board");
  const keyboardEl = document.getElementById("keyboard");
  const toastEl = document.getElementById("toast");
  const newGameBtn = document.getElementById("new-game");

  const KEY_ROWS = [
    "1234567890".split(""),
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    ["ENTER", ..."ZXCVBNM".split(""), "BACK"],
  ];
  const RANK = { absent: 1, present: 2, correct: 3 };

  let answer = "";
  let answerDisplay = "";
  let guesses = []; // [{ text, score }]
  let current = "";
  let over = false;
  let keyStatus = {};
  let toastTimer = null;

  function pickAnswer() {
    let next;
    do {
      next = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    } while (ANSWERS.length > 1 && next === answerDisplay);
    return next;
  }

  function newGame() {
    answerDisplay = pickAnswer();
    answer = answerDisplay.toUpperCase();
    guesses = [];
    current = "";
    over = false;
    keyStatus = {};
    showToast("");
    render();
    newGameBtn.blur();
  }

  function showToast(msg, ms) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    if (msg && ms) toastTimer = setTimeout(() => (toastEl.textContent = ""), ms);
  }

  function tile(ch, cls) {
    const el = document.createElement("div");
    el.className = "tile " + cls;
    el.textContent = ch;
    return el;
  }

  // anim: "add" pops the newest box, "reveal" flips the last submitted row.
  function render(anim) {
    boardEl.textContent = "";

    // Size boxes so the longest row on screen fits. This depends only on
    // what the player typed, never on the answer.
    const widest = Math.max(
      6,
      over ? 0 : Math.min(current.length + 1, MAX_LENGTH),
      ...guesses.map((g) => g.text.length)
    );
    boardEl.style.setProperty(
      "--tile",
      `min(52px, calc((100vw - 32px - ${widest - 1} * var(--gap)) / ${widest}))`
    );

    guesses.forEach((g, r) => {
      const row = document.createElement("div");
      row.className = "row";
      const revealing = anim === "reveal" && r === guesses.length - 1;
      [...g.text].forEach((ch, i) => {
        const t = tile(ch, g.score[i]);
        if (revealing) {
          t.classList.add("reveal");
          t.style.animationDelay = i * 120 + "ms";
        }
        row.appendChild(t);
      });
      boardEl.appendChild(row);
    });

    if (!over) {
      // Current row: typed letters plus one empty box for the next letter.
      const row = document.createElement("div");
      row.className = "row current";
      [...current].forEach((ch, i) => {
        const t = tile(ch, "filled");
        if (anim === "add" && i === current.length - 1) t.classList.add("pop");
        row.appendChild(t);
      });
      if (current.length < MAX_LENGTH) {
        const t = tile("", "cursor");
        if (anim === "add") t.classList.add("pop");
        row.appendChild(t);
      }
      boardEl.appendChild(row);

      // Remaining guesses: a single placeholder each, so no length hint.
      for (let r = guesses.length + 1; r < MAX_GUESSES; r++) {
        const row = document.createElement("div");
        row.className = "row";
        row.appendChild(tile("", "future"));
        boardEl.appendChild(row);
      }
    }

    renderKeyboard();
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
        if (k === "ENTER" || k === "BACK") {
          btn.classList.add("wide");
          btn.textContent = k === "BACK" ? "⌫" : "Enter";
          btn.setAttribute("aria-label", k === "BACK" ? "Backspace" : "Enter");
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
    if (over || current.length >= MAX_LENGTH) return;
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
    if (!current) {
      showToast("Type something first", 1500);
      shakeCurrentRow();
      return;
    }

    const score = scoreGuess(current, answer);
    guesses.push({ text: current, score });
    [...current].forEach((ch, i) => {
      if ((RANK[score[i]] || 0) > (RANK[keyStatus[ch]] || 0)) keyStatus[ch] = score[i];
    });

    const won = current === answer;
    current = "";
    if (won) {
      over = true;
      showToast(`You got it in ${guesses.length}! It was ${answerDisplay}.`);
    } else if (guesses.length >= MAX_GUESSES) {
      over = true;
      showToast(`Out of guesses. It was ${answerDisplay}.`);
    }
    render("reveal");
  }

  function handleKey(k) {
    if (k === "ENTER") submit();
    else if (k === "BACK") removeChar();
    else if (/^[A-Z0-9]$/.test(k)) addChar(k);
  }

  keyboardEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".key");
    if (btn) {
      handleKey(btn.dataset.key);
      btn.blur();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleKey("ENTER");
    } else if (e.key === "Backspace") {
      handleKey("BACK");
    } else if (e.key.length === 1) {
      handleKey(e.key.toUpperCase());
    }
  });

  newGameBtn.addEventListener("click", newGame);

  newGame();
}
