import React, { useState, useEffect, useRef } from 'react'
import questionsData from './data/questions.json'

// SVG Icons
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
)
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
)
const FlagIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
)
const TimerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
)
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
)

export default function App() {
  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  
  // App Navigation States
  // 'dashboard' | 'quiz' | 'result' | 'browse'
  const [screen, setScreen] = useState('dashboard')
  
  // Quiz Configurations State
  const [config, setConfig] = useState({
    numQuestions: 65,
    timeLimit: 130, // in minutes
    mode: 'practice' // 'practice' | 'exam'
  })
  
  // Quiz Running States
  const [quizQuestions, setQuizQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState({}) // { questionId: [selectedOptions] }
  const [flaggedQuestions, setFlaggedQuestions] = useState({}) // { questionId: boolean }
  const [timeLeft, setTimeLeft] = useState(0) // in seconds
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  
  // Browse & Search Mode States
  const [searchTerm, setSearchTerm] = useState('')
  const [searchFiltered, setSearchFiltered] = useState([])
  
  // Results Review States
  const [reviewFilter, setReviewFilter] = useState('all') // 'all' | 'correct' | 'incorrect' | 'flagged'
  const [expandedReviewId, setExpandedReviewId] = useState(null)
  
  // History Tracker
  const [quizHistory, setQuizHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('quiz_history')) || []
    } catch {
      return []
    }
  })

  // Toast Helper
  const showToast = (msg, type = 'default') => {
    setToastMessage({ text: msg, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Effect: Sync Theme with Document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Effect: Quiz Timer
  useEffect(() => {
    let interval = null
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setIsTimerActive(false)
            // Time Out - Auto Submit
            submitQuiz(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isTimerActive, timeLeft])

  // Effect: Auto-save quiz progress state
  useEffect(() => {
    if (screen === 'quiz' && quizQuestions.length > 0) {
      const stateToSave = {
        quizQuestions,
        currentIdx,
        userAnswers,
        flaggedQuestions,
        timeLeft,
        config
      }
      localStorage.setItem('active_quiz_session', JSON.stringify(stateToSave))
    }
  }, [currentIdx, userAnswers, flaggedQuestions, timeLeft, screen])

  // Check if a saved session exists
  const hasSavedSession = () => {
    return localStorage.getItem('active_quiz_session') !== null
  }

  // Resume saved session
  const resumeSession = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('active_quiz_session'))
      if (saved) {
        setQuizQuestions(saved.quizQuestions)
        setCurrentIdx(saved.currentIdx)
        setUserAnswers(saved.userAnswers)
        setFlaggedQuestions(saved.flaggedQuestions || {})
        setTimeLeft(saved.timeLeft)
        setConfig(saved.config)
        setIsTimerActive(true)
        setScreen('quiz')
        showToast('Quiz session resumed successfully!', 'success')
      }
    } catch (e) {
      showToast('Could not resume quiz session.', 'error')
      localStorage.removeItem('active_quiz_session')
    }
  }

  // Start new quiz
  const startQuiz = () => {
    // 1. Shuffle/Select questions
    let shuffled = [...questionsData].sort(() => 0.5 - Math.random())
    let selected = shuffled.slice(0, Math.min(config.numQuestions, questionsData.length))
    
    // Sort selected questions by original question number for neat layout
    selected.sort((a, b) => a.number - b.number)
    
    // 2. Initialize States
    setQuizQuestions(selected)
    setCurrentIdx(0)
    setUserAnswers({})
    setFlaggedQuestions({})
    setTimeLeft(config.timeLimit * 60)
    setIsTimerActive(true)
    setScreen('quiz')
    
    // Clean up any old session
    localStorage.removeItem('active_quiz_session')
    showToast(`Started new quiz with ${selected.length} questions!`, 'success')
  }

  // Handle Option Select
  const handleOptionClick = (optionLetter, maxAnswers) => {
    const qId = quizQuestions[currentIdx].number
    const currentSelected = userAnswers[qId] || []
    
    if (maxAnswers === 1) {
      // Single choice
      setUserAnswers({
        ...userAnswers,
        [qId]: [optionLetter]
      })
    } else {
      // Multiple choice (e.g. Choose two)
      let nextSelected
      if (currentSelected.includes(optionLetter)) {
        // Unselect
        nextSelected = currentSelected.filter((l) => l !== optionLetter)
      } else {
        // Select, enforce limit
        if (currentSelected.length < maxAnswers) {
          nextSelected = [...currentSelected, optionLetter]
        } else {
          // Replace last item
          nextSelected = [...currentSelected.slice(1), optionLetter]
        }
      }
      setUserAnswers({
        ...userAnswers,
        [qId]: nextSelected
      })
    }
  }

  // Check if answer is correct in Practice Mode
  const isQuestionAnswered = (idx) => {
    const qId = quizQuestions[idx]?.number
    return userAnswers[qId] && userAnswers[qId].length > 0
  }

  // Toggle flag/bookmark for current question
  const toggleFlag = () => {
    const qId = quizQuestions[currentIdx].number
    setFlaggedQuestions({
      ...flaggedQuestions,
      [qId]: !flaggedQuestions[qId]
    })
    showToast(flaggedQuestions[qId] ? 'Flag removed' : 'Question flagged', 'default')
  }

  // Submit Quiz
  const submitQuiz = (isAuto = false) => {
    setIsTimerActive(false)
    setShowSubmitModal(false)
    
    // Compute Score
    let correctCount = 0
    quizQuestions.forEach((q) => {
      const qId = q.number
      const answers = userAnswers[qId] || []
      const correct = q.correct_answers || []
      
      // Match arrays (order doesn't matter, length and items must match)
      if (answers.length === correct.length && answers.every((a) => correct.includes(a))) {
        correctCount++
      }
    })
    
    const percentage = Math.round((correctCount / quizQuestions.length) * 100)
    setFinalScore(percentage)
    setScreen('result')
    localStorage.removeItem('active_quiz_session')
    
    // Save to history
    const attempt = {
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score: percentage,
      correct: correctCount,
      total: quizQuestions.length,
      mode: config.mode,
      durationMinutes: Math.round((config.timeLimit * 60 - timeLeft) / 60)
    }
    const updatedHistory = [attempt, ...quizHistory].slice(0, 10) // Keep last 10 attempts
    setQuizHistory(updatedHistory)
    localStorage.setItem('quiz_history', JSON.stringify(updatedHistory))
    
    if (isAuto) {
      showToast('Time is up! Your exam has been submitted automatically.', 'error')
    } else {
      showToast('Quiz submitted successfully!', 'success')
    }
  }

  // Format Time Left: hh:mm:ss
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hrs > 0 ? hrs.toString().padStart(2, '0') + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Browser/Search filter effect
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchFiltered(questionsData)
    } else {
      const query = searchTerm.toLowerCase()
      const filtered = questionsData.filter(
        (q) =>
          q.question.toLowerCase().includes(query) ||
          q.explanation.toLowerCase().includes(query) ||
          Object.values(q.options).some((opt) => opt.toLowerCase().includes(query))
      )
      setSearchFiltered(filtered)
    }
  }, [searchTerm])

  // Helpers for Results Review UI
  const getReviewItems = () => {
    return quizQuestions.filter((q) => {
      const qId = q.number
      const answers = userAnswers[qId] || []
      const correct = q.correct_answers || []
      const isCorrect = answers.length === correct.length && answers.every((a) => correct.includes(a))
      
      if (reviewFilter === 'correct') return isCorrect
      if (reviewFilter === 'incorrect') return !isCorrect
      if (reviewFilter === 'flagged') return flaggedQuestions[qId]
      return true // 'all'
    })
  }

  return (
    <div className="app-container anim-fade">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast ${toastMessage.type}`}>
          <span>{toastMessage.type === 'success' ? '✅' : toastMessage.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <header>
        <div className="logo-section">
          <div className="logo-badge">SAA-C03</div>
          <h1 style={{ cursor: 'pointer' }} onClick={() => {
            if (screen === 'quiz') {
              if (window.confirm("Do you want to exit the quiz? Your current progress is saved, and you can resume later.")) {
                setIsTimerActive(false)
                setScreen('dashboard')
              }
            } else {
              setScreen('dashboard')
            }
          }}>AWS Cloud Architect Practice</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {screen === 'dashboard' && (
            <button className="btn btn-secondary" onClick={() => setScreen('browse')}>
              <span style={{ marginRight: '5px' }}>🔍</span> Browse All {questionsData.length} Qs
            </button>
          )}
          <button 
            className="theme-toggle" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* Main Body Switcher */}
      
      {/* DASHBOARD SCREEN */}
      {screen === 'dashboard' && (
        <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="card glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <h2 className="title-large">AWS Solutions Architect quiz simulator</h2>
            <p className="text-lead">Master AWS Cloud Architecture. Practice with a fully featured database of 684 questions from the official syllabus.</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={startQuiz} style={{ fontSize: '1.1rem', padding: '14px 32px' }}>
                🚀 Start New Practice
              </button>
              {hasSavedSession() && (
                <button className="btn btn-accent" onClick={resumeSession} style={{ fontSize: '1.1rem', padding: '14px 32px' }}>
                  ⏳ Resume Active Quiz
                </button>
              )}
            </div>
          </div>

          {/* Config Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '20px' }}>Exam Configuration</h3>
            <div className="config-grid">
              <div className="form-group">
                <label htmlFor="num-qs">Number of Questions</label>
                <select 
                  id="num-qs" 
                  className="form-control"
                  value={config.numQuestions}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    setConfig({
                      ...config,
                      numQuestions: val,
                      // Automatically match standard timing (approx 2 mins per question)
                      timeLimit: val === 684 ? 684 * 2 : val === 100 ? 200 : val === 65 ? 130 : val * 2
                    })
                  }}
                >
                  <option value={10}>10 Questions (Quick Review)</option>
                  <option value={25}>25 Questions (Short Quiz)</option>
                  <option value={65}>65 Questions (Official Exam Size)</option>
                  <option value={100}>100 Questions (Endurance Practice)</option>
                  <option value={684}>All 684 Questions (Complete Dump)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="time-limit">Time Limit (Minutes)</label>
                <input 
                  type="number" 
                  id="time-limit"
                  className="form-control"
                  min="1" 
                  max="1200"
                  value={config.timeLimit}
                  onChange={(e) => setConfig({ ...config, timeLimit: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label>Practice Mode vs Exam Simulator</label>
              <div className="mode-selector">
                <div 
                  className={`mode-option ${config.mode === 'practice' ? 'active' : ''}`}
                  onClick={() => setConfig({ ...config, mode: 'practice' })}
                >
                  <span className="mode-title">🎓 Practice Mode</span>
                  <span className="mode-description">Check answers immediately. Read full explanations, keywords, and reference architectures as you progress. Ideal for learning.</span>
                </div>
                <div 
                  className={`mode-option ${config.mode === 'exam' ? 'active' : ''}`}
                  onClick={() => setConfig({ ...config, mode: 'exam' })}
                >
                  <span className="mode-title">⏱️ Exam Mode</span>
                  <span className="mode-description">Full exam simulation. Timer countdown, hidden explanations, no immediate feedback. Detailed diagnostic report shown after submission.</span>
                </div>
              </div>
            </div>
          </div>

          {/* History Dashboard */}
          {quizHistory.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '15px' }}>Recent Activity</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>Mode</th>
                      <th style={{ padding: '12px' }}>Questions</th>
                      <th style={{ padding: '12px' }}>Score</th>
                      <th style={{ padding: '12px' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizHistory.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '12px' }}>{h.date}</td>
                        <td style={{ padding: '12px', textTransform: 'capitalize' }}>{h.mode}</td>
                        <td style={{ padding: '12px' }}>{h.correct}/{h.total}</td>
                        <td style={{ padding: '12px', fontWeight: '700', color: h.score >= 72 ? 'var(--success)' : 'var(--danger)' }}>{h.score}%</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge-status ${h.score >= 72 ? 'pass' : 'fail'}`} style={{ fontSize: '0.7rem', margin: 0, padding: '2px 8px' }}>
                            {h.score >= 72 ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QUIZ PANEL SCREEN */}
      {screen === 'quiz' && quizQuestions.length > 0 && (
        <div className="quiz-layout anim-fade">
          
          {/* Main Quiz Area */}
          <div className="quiz-main">
            {/* Header progress info */}
            <div className="quiz-meta">
              <div className="quiz-question-number">
                Question {currentIdx + 1} of {quizQuestions.length}
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-tertiary)', marginLeft: '10px' }}>
                  (Orig. #{quizQuestions[currentIdx].number})
                </span>
              </div>
              <div className={`quiz-timer ${timeLeft < 300 ? 'low-time' : ''}`}>
                <TimerIcon />
                <span>{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Progress bar fill */}
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill"
                style={{ width: `${((currentIdx + 1) / quizQuestions.length) * 100}%` }}
              ></div>
            </div>

            {/* Question Card */}
            <div className="card">
              {/* Check if multi-select */}
              {quizQuestions[currentIdx].correct_answers.length > 1 && (
                <div className="multi-select-hint">
                  🎯 Multiple Choice: Select {quizQuestions[currentIdx].correct_answers.length} options.
                </div>
              )}

              <div className="question-box">
                <p className="question-text">{quizQuestions[currentIdx].question}</p>
                
                <div className="options-list">
                  {Object.entries(quizQuestions[currentIdx].options).map(([letter, text]) => {
                    const qId = quizQuestions[currentIdx].number
                    const isSelected = (userAnswers[qId] || []).includes(letter)
                    const correctAnswers = quizQuestions[currentIdx].correct_answers || []
                    const isAnswered = isQuestionAnswered(currentIdx)
                    
                    // Style logic in Practice Mode when answered
                    let itemClass = "option-item"
                    if (isSelected) itemClass += " selected"
                    
                    if (config.mode === 'practice' && isAnswered) {
                      const isCorrectOption = correctAnswers.includes(letter)
                      if (isCorrectOption) {
                        // Mark green
                        itemClass += " correct-practice"
                      } else if (isSelected) {
                        // Mark red if chosen but wrong
                        itemClass += " incorrect-practice"
                      }
                    }

                    return (
                      <div 
                        key={letter}
                        className={itemClass}
                        onClick={() => {
                          // Prevent selecting different option once feedback is shown in Practice mode
                          if (config.mode === 'practice' && isAnswered) return
                          handleOptionClick(letter, correctAnswers.length)
                        }}
                        style={
                          config.mode === 'practice' && isAnswered
                            ? {
                                borderColor: correctAnswers.includes(letter)
                                  ? 'var(--success)'
                                  : isSelected
                                  ? 'var(--danger)'
                                  : 'var(--border-color)',
                                backgroundColor: correctAnswers.includes(letter)
                                  ? 'var(--success-light)'
                                  : isSelected
                                  ? 'var(--danger-light)'
                                  : 'var(--bg-card)'
                              }
                            : {}
                        }
                      >
                        <div 
                          className="option-letter"
                          style={
                            config.mode === 'practice' && isAnswered && correctAnswers.includes(letter)
                              ? { backgroundColor: 'var(--success)', color: 'white' }
                              : config.mode === 'practice' && isAnswered && isSelected && !correctAnswers.includes(letter)
                              ? { backgroundColor: 'var(--danger)', color: 'white' }
                              : {}
                          }
                        >
                          {letter}
                        </div>
                        <div className="option-text">{text}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Explanations shown only in Practice Mode once answered */}
              {config.mode === 'practice' && isQuestionAnswered(currentIdx) && (
                <div className={`feedback-panel ${
                  // Check if answer matches fully
                  (userAnswers[quizQuestions[currentIdx].number] || []).length === quizQuestions[currentIdx].correct_answers.length &&
                  (userAnswers[quizQuestions[currentIdx].number] || []).every(a => quizQuestions[currentIdx].correct_answers.includes(a))
                    ? 'correct'
                    : 'incorrect'
                }`}>
                  <div className="feedback-title">
                    {((userAnswers[quizQuestions[currentIdx].number] || []).length === quizQuestions[currentIdx].correct_answers.length &&
                    (userAnswers[quizQuestions[currentIdx].number] || []).every(a => quizQuestions[currentIdx].correct_answers.includes(a)))
                      ? '✓ Correct Answer'
                      : '✗ Incorrect Answer'}
                    <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginLeft: '10px' }}>
                      (Correct Choice: {quizQuestions[currentIdx].correct_answers.join(', ')})
                    </span>
                  </div>
                  <div className="feedback-explanation">
                    <p dangerouslySetInnerHTML={{ __html: quizQuestions[currentIdx].explanation.replace(/\n/g, '<br />') }}></p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Actions */}
            <div className="quiz-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
              >
                ◀ Back
              </button>

              <button 
                className={`btn btn-secondary ${flaggedQuestions[quizQuestions[currentIdx].number] ? 'btn-accent' : ''}`}
                onClick={toggleFlag}
                style={{ gap: '6px' }}
              >
                <FlagIcon filled={flaggedQuestions[quizQuestions[currentIdx].number]} />
                Flag
              </button>

              <div className="quiz-actions-right">
                <button className="btn btn-secondary" onClick={() => {
                  setIsTimerActive(false)
                  showToast('Progress saved automatically!', 'success')
                  setScreen('dashboard')
                }}>
                  💾 Save & Close
                </button>

                {currentIdx < quizQuestions.length - 1 ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setCurrentIdx(currentIdx + 1)}
                  >
                    Next ▶
                  </button>
                ) : (
                  <button 
                    className="btn btn-accent"
                    onClick={() => setShowSubmitModal(true)}
                  >
                    🏁 Finish Test
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Navigation Grid */}
          <div className="sidebar-panel card">
            <h3 className="sidebar-title">Question Grid</h3>
            <div className="question-grid">
              {quizQuestions.map((q, idx) => {
                const qId = q.number
                const isSelected = currentIdx === idx
                const isAnsweredVal = userAnswers[qId] && userAnswers[qId].length > 0
                const isFlagged = flaggedQuestions[qId]
                
                let cellClass = "grid-cell"
                if (isSelected) cellClass += " current"
                else if (isFlagged) cellClass += " flagged"
                else if (isAnsweredVal) cellClass += " answered"

                // Check for Practice Mode answer color indicators
                if (config.mode === 'practice' && isAnsweredVal) {
                  const correct = q.correct_answers || []
                  const chosen = userAnswers[qId] || []
                  const isCorrect = chosen.length === correct.length && chosen.every(a => correct.includes(a))
                  cellClass += isCorrect ? " correct-ans" : " incorrect-ans"
                }

                return (
                  <div 
                    key={qId} 
                    className={cellClass}
                    onClick={() => setCurrentIdx(idx)}
                  >
                    {idx + 1}
                  </div>
                )
              })}
            </div>

            <div style={{ fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '2px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}></span>
                <span>Unattempted</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--text-tertiary)' }}></span>
                <span>Answered</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '2px', border: '1px solid var(--warning)', backgroundColor: 'var(--warning-light)' }}></span>
                <span>Flagged</span>
              </div>
              {config.mode === 'practice' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--success)' }}></span>
                    <span>Correct</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--danger)' }}></span>
                    <span>Incorrect</span>
                  </div>
                </>
              )}
            </div>

            <button 
              className="btn btn-danger" 
              onClick={() => setShowSubmitModal(true)} 
              style={{ marginTop: '10px', width: '100%' }}
            >
              🏁 Submit Test
            </button>
          </div>

          {/* Submit Modal */}
          {showSubmitModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h4 className="modal-title">Finish Practice Quiz?</h4>
                <p className="modal-text">
                  You have answered {Object.keys(userAnswers).length} out of {quizQuestions.length} questions. Are you sure you want to submit and view your results?
                </p>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                  <button className="btn btn-accent" onClick={() => submitQuiz(false)}>Submit & Finish</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULTS SCREEN */}
      {screen === 'result' && (
        <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="card glass-panel" style={{ padding: '40px' }}>
            <div className="results-header">
              <div className="score-radial">
                <svg className="score-svg" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="var(--accent)" />
                    </linearGradient>
                  </defs>
                  <circle className="score-circle-bg" cx="50" cy="50" r="40" />
                  <circle 
                    className="score-circle-fill" 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - finalScore / 100)}
                  />
                </svg>
                <div className="score-value">
                  <span>{finalScore}%</span>
                  <span className="score-label">SCORE</span>
                </div>
              </div>

              <div className={`badge-status ${finalScore >= 72 ? 'pass' : 'fail'}`}>
                {finalScore >= 72 ? 'PASSED (Target 72%)' : 'FAILED (Target 72%)'}
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-val">{quizQuestions.length}</div>
                <div className="stat-lbl">TOTAL QUESTIONS</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: 'var(--success)' }}>
                  {quizQuestions.filter((q) => {
                    const ans = userAnswers[q.number] || []
                    const corr = q.correct_answers || []
                    return ans.length === corr.length && ans.every(a => corr.includes(a))
                  }).length}
                </div>
                <div className="stat-lbl">CORRECT</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: 'var(--danger)' }}>
                  {quizQuestions.filter((q) => {
                    const ans = userAnswers[q.number] || []
                    const corr = q.correct_answers || []
                    return ans.length > 0 && !(ans.length === corr.length && ans.every(a => corr.includes(a)))
                  }).length}
                </div>
                <div className="stat-lbl">INCORRECT</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: 'var(--text-tertiary)' }}>
                  {quizQuestions.filter((q) => !userAnswers[q.number] || userAnswers[q.number].length === 0).length}
                </div>
                <div className="stat-lbl">SKIPPED</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <button className="btn btn-primary" onClick={() => setScreen('dashboard')}>
                🏠 Go to Dashboard
              </button>
              <button className="btn btn-secondary" onClick={startQuiz}>
                🔄 Retake Test
              </button>
            </div>
          </div>

          {/* Diagnostic Review Section */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '20px' }}>Diagnostic Review</h3>
            
            {/* Filter buttons */}
            <div className="review-filters">
              <button 
                className={`filter-btn ${reviewFilter === 'all' ? 'active' : ''}`}
                onClick={() => setReviewFilter('all')}
              >
                All Questions ({quizQuestions.length})
              </button>
              <button 
                className={`filter-btn ${reviewFilter === 'correct' ? 'active' : ''}`}
                onClick={() => setReviewFilter('correct')}
              >
                Correct ({
                  quizQuestions.filter((q) => {
                    const ans = userAnswers[q.number] || []
                    const corr = q.correct_answers || []
                    return ans.length === corr.length && ans.every(a => corr.includes(a))
                  }).length
                })
              </button>
              <button 
                className={`filter-btn ${reviewFilter === 'incorrect' ? 'active' : ''}`}
                onClick={() => setReviewFilter('incorrect')}
              >
                Incorrect ({
                  quizQuestions.filter((q) => {
                    const ans = userAnswers[q.number] || []
                    const corr = q.correct_answers || []
                    return ans.length > 0 && !(ans.length === corr.length && ans.every(a => corr.includes(a)))
                  }).length
                })
              </button>
              <button 
                className={`filter-btn ${reviewFilter === 'flagged' ? 'active' : ''}`}
                onClick={() => setReviewFilter('flagged')}
              >
                Flagged ({quizQuestions.filter((q) => flaggedQuestions[q.number]).length})
              </button>
            </div>

            {/* List of Review Items */}
            <div>
              {getReviewItems().map((q, idx) => {
                const qId = q.number
                const isExpanded = expandedReviewId === qId
                const chosen = userAnswers[qId] || []
                const correct = q.correct_answers || []
                const isCorrect = chosen.length === correct.length && chosen.every(a => correct.includes(a))
                const isSkipped = chosen.length === 0

                return (
                  <div key={qId} className="review-item">
                    <div 
                      className="review-item-header"
                      onClick={() => setExpandedReviewId(isExpanded ? null : qId)}
                    >
                      <div className="review-item-title">
                        <span style={{ color: isCorrect ? 'var(--success)' : isSkipped ? 'var(--text-tertiary)' : 'var(--danger)' }}>
                          {isCorrect ? '✓' : isSkipped ? '⚪' : '✗'}
                        </span>
                        <span>Question {idx + 1} (Orig. #{qId})</span>
                        {flaggedQuestions[qId] && <span style={{ color: 'var(--warning)' }}>🚩</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="review-item-body anim-fade">
                        <p style={{ fontWeight: '600', marginBottom: '15px' }}>{q.question}</p>
                        
                        <div className="options-list" style={{ marginBottom: '20px' }}>
                          {Object.entries(q.options).map(([letter, optText]) => {
                            const isChosenOpt = chosen.includes(letter)
                            const isCorrectOpt = correct.includes(letter)
                            
                            let optClass = "review-option"
                            if (isCorrectOpt) optClass += " correct-choice"
                            else if (isChosenOpt) optClass += " incorrect-choice"
                            
                            return (
                              <div key={letter} className={optClass} style={
                                isCorrectOpt
                                  ? { borderColor: 'var(--success)', backgroundColor: 'var(--success-light)' }
                                  : isChosenOpt
                                  ? { borderColor: 'var(--danger)', backgroundColor: 'var(--danger-light)' }
                                  : {}
                              }>
                                <span className="review-option-letter">{letter}.</span>
                                <span>{optText}</span>
                                {isCorrectOpt && <span style={{ float: 'right', color: 'var(--success)', fontWeight: '700' }}>Correct Choice</span>}
                                {isChosenOpt && !isCorrectOpt && <span style={{ float: 'right', color: 'var(--danger)', fontWeight: '700' }}>Your Choice</span>}
                                {isChosenOpt && isCorrectOpt && <span style={{ float: 'right', color: 'var(--success)', fontWeight: '700' }}>Your Correct Choice</span>}
                              </div>
                            )
                          })}
                        </div>

                        <div className="feedback-panel correct" style={{ margin: 0, borderLeftColor: 'var(--accent)' }}>
                          <h5 className="feedback-title" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>Solution & Explanation</h5>
                          <p className="feedback-explanation" dangerouslySetInnerHTML={{ __html: q.explanation.replace(/\n/g, '<br />') }}></p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {getReviewItems().length === 0 && (
                <div style={{ textSelf: 'center', padding: '30px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  No questions match the current filter.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BROWSE ALL QUESTIONS SCREEN */}
      {screen === 'browse' && (
        <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <h2 className="title-large">Browse Question Bank</h2>
            <p className="text-lead" style={{ marginBottom: '15px' }}>Browse, search, and study all {questionsData.length} SAA-C03 exam questions along with answer keys and complete explanations.</p>
            
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Search by keywords, services, concepts (e.g. SQS, VPC, Aurora, cost)..." 
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-primary" style={{ padding: '12px 18px' }}>
                <SearchIcon />
              </button>
            </div>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {searchFiltered.length} of {questionsData.length} questions
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {searchFiltered.slice(0, 15).map((q) => {
              const qId = q.number
              const isExpanded = expandedReviewId === qId
              const correct = q.correct_answers || []

              return (
                <div key={qId} className="review-item">
                  <div 
                    className="review-item-header"
                    onClick={() => setExpandedReviewId(isExpanded ? null : qId)}
                  >
                    <div className="review-item-title">
                      <span>☁️</span>
                      <span>Question #{qId}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="review-item-body anim-fade">
                      <p style={{ fontWeight: '600', marginBottom: '15px' }}>{q.question}</p>
                      
                      <div className="options-list" style={{ marginBottom: '20px' }}>
                        {Object.entries(q.options).map(([letter, optText]) => {
                          const isCorrectOpt = correct.includes(letter)
                          
                          return (
                            <div key={letter} className="review-option" style={
                              isCorrectOpt
                                ? { borderColor: 'var(--success)', backgroundColor: 'var(--success-light)' }
                                : {}
                            }>
                              <span className="review-option-letter">{letter}.</span>
                              <span>{optText}</span>
                              {isCorrectOpt && <span style={{ float: 'right', color: 'var(--success)', fontWeight: '700' }}>Correct Answer</span>}
                            </div>
                          )
                        })}
                      </div>

                      <div className="feedback-panel correct" style={{ margin: 0, borderLeftColor: 'var(--accent)' }}>
                        <h5 className="feedback-title" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>Solution & Explanation</h5>
                        <p className="feedback-explanation" dangerouslySetInnerHTML={{ __html: q.explanation.replace(/\n/g, '<br />') }}></p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

              {searchFiltered.length > 15 && (
                <div style={{ textAlign: 'center', padding: '15px', color: 'var(--text-tertiary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  Showing first 15 matches. Refine search query to see other questions.
                </div>
              )}

              {searchFiltered.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                  No questions match your search query. Try using simpler keywords.
                </div>
              )}
          </div>
          
          <div style={{ textAlign: 'center', margin: '15px 0' }}>
            <button className="btn btn-secondary" onClick={() => setScreen('dashboard')}>
              ◀ Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
