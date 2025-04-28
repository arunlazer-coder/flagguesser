import React, { useEffect, useRef, useState } from 'react';

type Country = {
  name: string;
  flag: string;
};

const FLAG_API = 'https://restcountries.com/v3.1/all?fields=name,flags';
const ROUND_TIME = 12; // seconds per round
const CHOICES = 4;

function getShuffled<T>(arr: T[]): T[] {
  return arr.map(v => [Math.random(), v] as const).sort((a, b) => a[0] - b[0]).map(([_, v]) => v);
}

function getChoices(all: Country[], correct: Country, count: number): Country[] {
  const others = getShuffled(all.filter(c => c.name !== correct.name)).slice(0, count - 1);
  return getShuffled([correct, ...others]);
}

export default function App() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [current, setCurrent] = useState<Country | null>(null);
  const [choices, setChoices] = useState<Country[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [hinted, setHinted] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [feedback, setFeedback] = useState<'pending' | 'correct' | 'wrong'>('pending');
  const [showModal, setShowModal] = useState(false);
  const [timer, setTimer] = useState(ROUND_TIME);
  const timerRef = useRef<any>();

  // Get & set high score from localStorage
  useEffect(() => {
    const val = localStorage.getItem('highscore');
    if (val) setHighScore(Number(val));
  }, []);

  useEffect(() => {
    localStorage.setItem('highscore', String(Math.max(score, highScore)));
  }, [score, highScore]);

  // Fetch API once
  useEffect(() => {
    (async () => {
      const res = await fetch(FLAG_API);
      const data = await res.json();
      const arr: Country[] = data
        .filter((c: any) => c.flags?.svg && c.name?.common)
        .map((c: any) => ({
          flag: c.flags.svg,
          name: c.name.common,
        }));
      setCountries(arr);
    })();
  }, []);

  // Set up new round
  useEffect(() => {
    if (!countries.length) return;
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, level]);

  // Timer logic
  useEffect(() => {
    if (!current || showModal) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedback !== 'pending') return;

    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 0) {
          clearInterval(timerRef.current!);
          handleOptionSelect('');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, feedback, showModal]);

  function startNewRound(nextLevel?: boolean) {
    setFeedback('pending');
    setHinted(false);
    setSkipped(false);
    setSelected(null);
    setTimer(ROUND_TIME);
    if (nextLevel) setLevel(l => l + 1);
    // Pick random flag
    const correct = countries[Math.floor(Math.random() * countries.length)];
    setCurrent(correct);
    setChoices(getChoices(countries, correct, CHOICES));
  }

  function handleOptionSelect(opt: string) {
    if (!current || selected) return;
    setSelected(opt);
    if (opt === current.name) {
      setFeedback('correct');
      setScore(s => s + (hinted ? 1 : 2));
      setHighScore(hs => Math.max(score + (hinted ? 1 : 2), hs));
      setTimeout(() => startNewRound(true), 1400);
    } else {
      setFeedback('wrong');
      setTimeout(() => setShowModal(true), 1200);
    }
  }

  function handleSkip() {
    if (selected) return;
    setSkipped(true);
    setFeedback('wrong');
    setTimeout(() => setShowModal(true), 700);
  }

  function handleHint() {
    if (hinted || selected) return;
    setHinted(true);
  }

  function handlePlayAgain() {
    setScore(0);
    setLevel(1);
    setShowModal(false);
    setFeedback('pending');
    setTimer(ROUND_TIME);
    setSelected(null);
    setHinted(false);
    setSkipped(false);
    // Next flag
    setTimeout(() => startNewRound(), 100);
  }

  const feedbackEmoji = feedback === 'pending' ? '🤔' : feedback === 'correct' ? '🎉' : '❌';

  // For hint: reduce to two options, always keep correct
  const shownOptions = hinted && feedback==='pending' && current
    ? getShuffled([
        choices.find(c => c.name === current.name)!,
        choices.find(c => c.name !== current.name)!,
      ])
    : choices;

  // Timer bar width % (0-100)
  const timerWidth = Math.max(0, (timer / ROUND_TIME) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#74ebd5] to-[#ACB6E5]">
      <div className="custom-container">
        <div className="custom-globe" />
        <span className="custom-level">Level {level}</span>
        <h1 className="custom-title after:content-[''] after:absolute after:-bottom-2 after:left-1/2 after:-translate-x-1/2 after:w-1/2 after:h-1 after:rounded bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] after:block">Flag Guesser Change Test 3</h1>
        <div className="custom-score">
          <span>Score: <strong>{score}</strong></span>
          <span>High Score: <strong>{highScore}</strong></span>
        </div>
        <div className="custom-timer"><div className="custom-timer-fill" style={{ width: timerWidth + '%' }} /></div>
        <div className="custom-flag-container">
          {current && (
            <img
              className="custom-flag"
              src={current.flag}
              alt="Flag to guess"
              loading="lazy"
            />
          )}
          <div className="custom-feedback" aria-live="polite">{feedbackEmoji}</div>
        </div>
        <div className="custom-options">
          {shownOptions && shownOptions.map(opt => (
            <button
              key={opt.name}
              className={
                `custom-option` +
                (selected
                  ? opt.name === current?.name
                    ? ' correct'
                    : selected === opt.name
                      ? ' wrong' : ''
                  : '')
              }
              onClick={() => handleOptionSelect(opt.name)}
              disabled={!!selected}
              tabIndex={feedback === 'pending' ? 0 : -1}
            >{opt.name}</button>
          ))}
        </div>
        <div className="custom-controls">
          <button className="custom-btn" disabled={hinted || !!selected} onClick={handleHint}>Hint</button>
          <button className="custom-btn" disabled={!!selected} onClick={handleSkip}>Skip</button>
        </div>
        <div className={
          'custom-modal' + (showModal ? ' active' : '')
        }>
          <div className="custom-modal-content">
            <h2>Game Over!</h2>
            <p>Your score: <strong>{score}</strong></p>
            <button className="custom-btn mt-4" onClick={handlePlayAgain}>Play Again</button>
          </div>
        </div>
      </div>
    </div>
  );
}
