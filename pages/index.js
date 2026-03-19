import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendPulse, setSendPulse] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [latestFollowUps, setLatestFollowUps] = useState([]);
  const messagesEndRef = useRef(null);
  const canvasRef = useRef(null);
  const starsRef = useRef([]);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const animIdRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initializeStars = () => {
      starsRef.current = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        baseOpacity: Math.random() * 0.6 + 0.3,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        currentOpacity: 0.5,
        glow: 0,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: Math.random() * 0.01 + 0.003,
      }));
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initializeStars();
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.fillStyle = '#0B080E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gradientBg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradientBg.addColorStop(0, 'rgba(20, 10, 30, 0.3)');
      gradientBg.addColorStop(1, 'rgba(10, 5, 20, 0.2)');
      ctx.fillStyle = gradientBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      starsRef.current.forEach((star) => {
        // Floating drift
        star.floatPhase += star.floatSpeed;
        const floatX = Math.cos(star.floatPhase) * 0.5;
        const floatY = Math.sin(star.floatPhase * 0.7) * 0.5;
        star.x += star.vx + floatX;
        star.y += star.vy + floatY;

        // Cursor attraction
        const dx = star.x - mousePosRef.current.x;
        const dy = star.y - mousePosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 300;
        if (distance < interactionRadius) {
          const force = (1 - distance / interactionRadius) * 0.15;
          const angle = Math.atan2(dy, dx);
          star.vx -= Math.cos(angle) * force;
          star.vy -= Math.sin(angle) * force;
        }
        star.vx *= 0.95;
        star.vy *= 0.95;

        // Wrap edges
        if (star.x < -10) star.x = canvas.width + 10;
        if (star.x > canvas.width + 10) star.x = -10;
        if (star.y < -10) star.y = canvas.height + 10;
        if (star.y > canvas.height + 10) star.y = -10;

        // Twinkling
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.4 + 0.6;
        star.currentOpacity = star.baseOpacity * twinkle;

        // Cursor glow
        const glowRadius = 250;
        if (distance < glowRadius) {
          const glowIntensity = (1 - distance / glowRadius) * 0.6;
          star.glow = glowIntensity;
          star.currentOpacity = Math.min(star.currentOpacity + glowIntensity, 1);
        } else {
          star.glow = 0;
        }

        const opacity = star.currentOpacity;

        // Larger stars: radial glow halo
        if (star.size > 1.2) {
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 3
          );
          gradient.addColorStop(0, `rgba(200, 190, 255, ${opacity * 0.5})`);
          gradient.addColorStop(0.4, `rgba(200, 190, 255, ${opacity * 0.2})`);
          gradient.addColorStop(1, 'rgba(200, 190, 255, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Star core
        ctx.fillStyle = `rgba(230, 220, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, []);

  const sendText = async (text) => {
    if (!text) return;
    setInput('');
    setSendPulse(true);
    setTimeout(() => setSendPulse(false), 180);

    setMessages(prev => [...prev, { role: 'user', content: text, time: new Date() }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          time: new Date(),
          followUps: data.followUps || [],
        }]);
        setLatestFollowUps(data.followUps || []);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error || 'Something went wrong'}`,
          time: new Date(),
          followUps: [],
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to connect to the server.',
        time: new Date(),
        followUps: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    sendText(input.trim());
  };

  const clearChat = () => {
    setMessages([]);
    setLatestFollowUps([]);
  };

  return (
    <>
      <Head>
        <title>Muneeb Ashraf — AI Portfolio</title>
        <meta name="description" content="Interactive CV chatbot powered by RAG" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
      </Head>

      {/* AnimatedBackground — fixed blobs layer, matches AnimatedBackground.tsx */}
      <div className="animBg" aria-hidden="true">
        <div className="animBase" />
        <div className="animBlob animBlobOne" />
        <div className="animBlob animBlobTwo" />
        <div className="animBlob animBlobThree" />
        <div className="animBlob animBlobFour" />
      </div>

      <div className="pageWrap" data-theme="dark">
        {/* ── Global Header ── */}
        <header className="siteHeader">
          <div className="siteHeaderInner">
            <div className="siteLogo">
              <span className="siteLogoMark">MA</span>
              <span className="siteLogoText">Muneeb Ashraf</span>
            </div>
            <nav className="siteNav">
              <a href="https://muneeb-ashraf.vercel.app/" target="_blank" rel="noopener noreferrer" className="siteNavLink siteNavIconLink" aria-label="Portfolio">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                <span>Portfolio</span>
              </a>
              <a href="https://github.com/alphaaa-m" target="_blank" rel="noopener noreferrer" className="siteNavLink siteNavIconLink" aria-label="GitHub">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                <span>GitHub</span>
              </a>
              <a href="https://www.linkedin.com/in/muneeb-ashraf-ai/" target="_blank" rel="noopener noreferrer" className="siteNavLink siteNavIconLink" aria-label="LinkedIn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                <span>LinkedIn</span>
              </a>
              <a href="https://wa.me/923006275648" target="_blank" rel="noopener noreferrer" className="siteNavLink siteNavIconLink" aria-label="WhatsApp">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span>WhatsApp</span>
              </a>
              <a href="mailto:muneebashraf.edu@gmail.com" className="siteNavLink siteNavIconLink" aria-label="Email">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                <span>Mail</span>
              </a>
              <a href="/assets/CV_Muneeb_Ashraf.pdf" download className="downloadCvBtn">
                <span className="downloadCvIcon">↓</span>
                <span>Download CV</span>
              </a>
            </nav>
          </div>
        </header>

        {/* ── Main layout ── */}
        <div className={`appShell${latestFollowUps.length > 0 ? ' appShellWide' : ''}`}>
          <canvas ref={canvasRef} className="particleCanvas" />

          {/* ── Suggestions Sidebar ── */}
          <aside className="suggestionsPanel">
            <div className="suggestionsPanelHeader">
              <span className="suggestionsPanelIcon">✦</span>
              <span className="suggestionsPanelTitle">Quick Questions</span>
            </div>
            <div className="suggestionsList">
              <button onClick={() => sendText("Who is Muneeb?")} className="sideSuggestionBtn">🙋 Who is Muneeb?</button>
              <button onClick={() => sendText("What are Muneeb's skills?")} className="sideSuggestionBtn">⚡ What are Muneeb's skills?</button>
              <button onClick={() => sendText("Who are you?")} className="sideSuggestionBtn">🤖 Who are you?</button>
              <button onClick={() => sendText("What projects has Muneeb worked on?")} className="sideSuggestionBtn">🚀 What projects has Muneeb worked on?</button>
              <button onClick={() => sendText("What is Muneeb's educational background?")} className="sideSuggestionBtn">🎓 Educational background?</button>
              <button onClick={() => sendText("What work experience does Muneeb have?")} className="sideSuggestionBtn">💼 Work experience?</button>
              <button onClick={() => sendText("How can I contact Muneeb?")} className="sideSuggestionBtn">📬 How to contact Muneeb?</button>
            </div>
          </aside>

          <section className="chatPanel">
          <header className="chatHeader">
            <div>
              <h2 className="chatTitle">Alpha — Muneeb's AI Assistant</h2>
              <p className="chatSubtitle">Ask me anything about Muneeb's background, skills &amp; projects</p>
            </div>
            <div className="headerRight">
              <div className="statusWrap">
                <span className="statusDot" />
                <span className="statusText">Online</span>
              </div>
              {messages.length > 0 && (
                <button onClick={clearChat} className="clearBtn">
                  Clear
                </button>
              )}
            </div>
          </header>

          <main className="messagesContainer">
            {messages.length === 0 ? (
              <div className="emptyState">
                <h3 className="emptyTitle">Hi! I'm Alpha 👋</h3>
                <p className="emptyText">Muneeb's personal AI assistant. Select a question from the panel on the left, or type your own below.</p>
              </div>
            ) : (
              <div className="messages">
                {messages.map((msg, idx) => (
                  <div key={idx}>
                    <article
                      className={`message ${msg.role === 'user' ? 'userMessage' : 'assistantMessage'}`}
                    >
                      <div className="messageMeta">
                        <span>{msg.role === 'user' ? 'You' : 'Alpha'}</span>
                        <span>{msg.time ? msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <div className="messageContent">{msg.content}</div>
                      {msg.role === 'assistant' && (
                        <div className="contactBar">
                          <span className="contactBarText">For quick &amp; more accurate answers,</span>
                          <button className="contactBarBtn" onClick={() => setContactOpen(true)}>Contact Muneeb</button>
                        </div>
                      )}
                    </article>
                  </div>
                ))}
                {loading && (
                  <article className="message assistantMessage">
                    <div className="messageMeta">
                      <span>Alpha</span>
                      <span>Now</span>
                    </div>
                    <div className="messageContent typing">
                      <span className="typingDot" />
                      <span className="typingDot" />
                      <span className="typingDot" />
                    </div>
                  </article>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </main>

          <form onSubmit={sendMessage} className="composer">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about Muneeb…"
              className="input"
              disabled={loading}
            />
            <button
              type="submit"
              className={`sendBtn ${sendPulse ? 'sendPulse' : ''}`}
              disabled={loading || !input.trim()}
            >
              {loading ? '⏳' : '➤'}
            </button>
          </form>
        </section>

          {/* ── Follow-ups Right Panel ── */}
          {latestFollowUps.length > 0 && (
            <aside className="followUpsPanel">
              <div className="followUpsPanelHeader">
                <span className="followUpsPanelIcon">✧</span>
                <span className="followUpsPanelTitle">You might want to ask</span>
              </div>
              <div className="followUpsPanelList">
                {latestFollowUps.map((q, qi) => (
                  <button key={qi} className="followUpSideBtn" onClick={() => sendText(q)}>{q}</button>
                ))}
              </div>
            </aside>
          )}
      </div>

        {/* ── Global Footer ── */}
        <footer className="siteFooter">
          <div className="siteFooterInner">
            <span className="footerLeft">© 2025 Muneeb Ashraf · All rights reserved</span>
            <span className="footerRight">Powered by RAG</span>
          </div>
        </footer>

      </div>

      {/* ── Contact Modal ── */}
      {contactOpen && (
        <div className="contactModalOverlay" onClick={() => setContactOpen(false)}>
          <div className="contactModalCard" onClick={e => e.stopPropagation()}>
            <div className="contactModalHeader">
              <h4 className="contactModalTitle">Contact Muneeb</h4>
              <button className="contactModalClose" onClick={() => setContactOpen(false)}>✕</button>
            </div>
            <p className="contactModalSub">Reach out directly for the most accurate answers.</p>
            <div className="contactModalOptions">
              <a href="mailto:muneebashraf.edu@gmail.com" className="contactOption">
                <span className="contactOptionIcon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                </span>
                <span>Email</span>
              </a>
              <a href="https://wa.me/923006275648" target="_blank" rel="noopener noreferrer" className="contactOption">
                <span className="contactOptionIcon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </span>
                <span>WhatsApp</span>
              </a>
              <a href="https://muneeb-ashraf.vercel.app/" target="_blank" rel="noopener noreferrer" className="contactOption">
                <span className="contactOptionIcon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93V18c0-.55.45-1 1-1s1 .45 1 1v1.93C10.06 19.72 8.5 18.89 7.28 17.7L8.7 16.28c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41L8.7 19.13a7.94 7.94 0 003.3.8zm4.99-.31l-1.42-1.42a1 1 0 010-1.41 1 1 0 011.41 0l1.42 1.42A7.963 7.963 0 0019.93 13H18c-.55 0-1-.45-1-1s.45-1 1-1h1.93a8.001 8.001 0 00-7.93-7.93V5c0 .55-.45 1-1 1s-1-.45-1-1V3.07A8.001 8.001 0 004.07 11H6c.55 0 1 .45 1 1s-.45 1-1 1H4.07a8.001 8.001 0 007.93 7.93V20c0-.55.45-1 1-1s1 .45 1 1v-.38z"/></svg>
                </span>
                <span>Portfolio</span>
              </a>
              <a href="https://www.linkedin.com/in/muneeb-ashraf-ai/" target="_blank" rel="noopener noreferrer" className="contactOption">
                <span className="contactOptionIcon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </span>
                <span>LinkedIn</span>
              </a>
              <a href="https://github.com/alphaaa-m" target="_blank" rel="noopener noreferrer" className="contactOption">
                <span className="contactOptionIcon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                </span>
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(:root) {
          --color-primary:       #6B3B8E;
          --color-secondary:     #7D4FB3;
          --color-accent:        #C4B5FD;
          --color-bg:            #0B080E;
          --color-surface:       #1E1428;
          --color-surface-alt:   #3E1F5A;
          --color-text-primary:  #FFFFFF;
          --color-text-secondary: rgba(255, 255, 255, 0.6);
          --color-border:        rgba(255, 255, 255, 0.1);
          --color-success:       #22C55E;
          --color-warning:       #F59E0B;
          --color-error:         #EF4444;
          --shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.5);
          --radius-xl: 24px;
          --radius-lg: 16px;
          --radius-md: 12px;
          --transition-base: 250ms ease-in-out;
        }

        :global([data-theme="dark"]) {
          --color-bg:          #0B080E;
          --color-surface:     #1E1428;
          --color-surface-alt: #3E1F5A;
        }

        :global(html), :global(body) {
          margin: 0;
          padding: 0;
          height: 100%;
          background: #0B080E;
          overflow: hidden;
        }

        /* Outer shell: header + split + footer locked to full viewport */
        .pageWrap {
          height: 100dvh;
          width: 100%;
          display: grid;
          grid-template-rows: auto 1fr auto;
          overflow: hidden;
          color: var(--color-text-primary);
          font-family: 'Inter', 'Poppins', system-ui, -apple-system, sans-serif;
          position: relative;
          z-index: 1;
        }

        /* ── Site Header ── */
        .siteHeader {
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(11, 8, 14, 0.75);
          backdrop-filter: blur(18px);
          flex-shrink: 0;
          z-index: 10;
        }

        .siteHeaderInner {
          max-width: 100%;
          padding: 0 2rem;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .siteLogo {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          text-decoration: none;
        }

        .siteLogoMark {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
          display: grid;
          place-items: center;
          font-size: 0.78rem;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }

        .siteLogoText {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text-primary);
          white-space: nowrap;
        }

        .siteNav {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .siteNavLink {
          color: var(--color-text-secondary);
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 500;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          border: 1px solid transparent;
          transition: color var(--transition-base), border-color var(--transition-base), background var(--transition-base);
        }

        .siteNavLink:hover {
          color: var(--color-text-primary);
          border-color: rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
        }

        .siteNavIconLink {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        /* ── Split layout: sidebar + chat + follow-ups ── */
        .appShell {
          min-height: 0;
          height: 100%;
          width: 100%;
          background: transparent;
          display: grid;
          grid-template-columns: 240px 1fr;
          overflow: hidden;
          position: relative;
        }

        .appShellWide {
          grid-template-columns: 240px 1fr 220px;
        }

        /* ── Suggestions Sidebar ── */
        .suggestionsPanel {
          border-right: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(11, 8, 14, 0.55);
          backdrop-filter: blur(18px);
          display: flex;
          flex-direction: column;
          padding: 1.2rem 0.85rem;
          gap: 0.5rem;
          overflow-y: auto;
          scrollbar-width: none;
          z-index: 1;
        }

        .suggestionsPanel::-webkit-scrollbar {
          display: none;
        }

        .suggestionsPanelHeader {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0 0.1rem 0.6rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          margin-bottom: 0.3rem;
        }

        .suggestionsPanelIcon {
          font-size: 0.75rem;
          color: #C4B5FD;
        }

        .suggestionsPanelTitle {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .suggestionsList {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .sideSuggestionBtn {
          border: 1px solid rgba(196, 181, 253, 0.18);
          background: rgba(18, 8, 28, 0.6);
          color: var(--color-text-primary);
          border-radius: 10px;
          padding: 0.6rem 0.75rem;
          font-size: 0.82rem;
          text-align: left;
          cursor: pointer;
          line-height: 1.35;
          backdrop-filter: blur(10px);
          transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base), background var(--transition-base);
          width: 100%;
        }

        .sideSuggestionBtn:hover {
          transform: translateX(3px);
          border-color: #C4B5FD;
          background: rgba(107, 59, 142, 0.3);
          box-shadow: 0 4px 18px rgba(196, 181, 253, 0.15);
        }

        /* ── Site Footer ── */
        .siteFooter {
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(11, 8, 14, 0.75);
          backdrop-filter: blur(18px);
          flex-shrink: 0;
          z-index: 10;
        }

        .siteFooterInner {
          padding: 0 2rem;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .footerLeft,
        .footerRight {
          font-size: 0.78rem;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }

        .particleCanvas {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }

        /* ── AnimatedBackground (matches AnimatedBackground.tsx) ── */
        .animBg {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }

        .animBase {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom right, #0B080E, #0B080E, #1a0d2e);
        }

        .animBlob {
          position: absolute;
          border-radius: 999px;
        }

        /* Blob 1 — #6B3B8E — 600×600 — 25s — scale/translate/rotate */
        .animBlobOne {
          width: 600px;
          height: 600px;
          top: -33%;
          left: -25%;
          background: #6B3B8E;
          filter: blur(120px);
          opacity: 0.5;
          animation: kfBlobOne 25s linear infinite;
        }

        /* Blob 2 — #3E1F5A — 700×700 — 30s */
        .animBlobTwo {
          width: 700px;
          height: 700px;
          top: 33%;
          right: -33%;
          background: #3E1F5A;
          filter: blur(140px);
          opacity: 0.4;
          animation: kfBlobTwo 30s linear infinite;
        }

        /* Blob 3 — #7D4FB3 — 500×500 — 20s */
        .animBlobThree {
          width: 500px;
          height: 500px;
          bottom: -25%;
          left: 33%;
          background: #7D4FB3;
          filter: blur(130px);
          opacity: 0.35;
          animation: kfBlobThree 20s linear infinite;
        }

        /* Blob 4 — #9D68C1 — 400×400 — 35s */
        .animBlobFour {
          width: 400px;
          height: 400px;
          bottom: 25%;
          right: 25%;
          background: #9D68C1;
          filter: blur(100px);
          opacity: 0.25;
          animation: kfBlobFour 35s linear infinite;
        }

        @keyframes kfBlobOne {
          0%   { transform: scale(1)   translate(0, 0)         rotate(0deg); }
          50%  { transform: scale(1.3) translate(150px, 80px)  rotate(90deg); }
          100% { transform: scale(1)   translate(0, 0)         rotate(180deg); }
        }

        @keyframes kfBlobTwo {
          0%   { transform: scale(1)   translate(0, 0)           rotate(180deg); }
          50%  { transform: scale(1.4) translate(-120px, 150px)  rotate(90deg); }
          100% { transform: scale(1)   translate(0, 0)           rotate(0deg); }
        }

        @keyframes kfBlobThree {
          0%   { transform: scale(1.1) translate(0, 0)          rotate(0deg); }
          50%  { transform: scale(1)   translate(100px, -120px) rotate(180deg); }
          100% { transform: scale(1.2) translate(-50px, 0)      rotate(360deg); }
        }

        @keyframes kfBlobFour {
          0%   { transform: scale(1)   translate(0, 0); }
          50%  { transform: scale(1.2) translate(-80px, 100px); }
          100% { transform: scale(0.9) translate(50px, -50px); }
        }

        .profilePanel,
        .chatPanel {
          background: transparent;
          position: relative;
          height: 100%;
          overflow: hidden;
        }

        .profilePanel {
          display: grid;
          place-items: center;
          padding: 2rem;
          isolation: isolate;
          z-index: 1;
        }

        .profileCard {
          width: min(460px, 100%);
          background: rgba(20, 10, 30, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xl);
          padding: 2rem;
          backdrop-filter: blur(18px);
          box-shadow: var(--shadow-soft);
          text-align: center;
          z-index: 2;
        }

        .profileHalo {
          width: 260px;
          height: 260px;
          border-radius: 32px;
          margin: 0 auto 1.25rem;
          padding: 6px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent), var(--color-secondary));
          box-shadow: 0 0 60px rgba(110, 80, 180, 0.55);
        }

        .profileImage,
        .profileFallback {
          width: 100%;
          height: 100%;
          border-radius: 28px;
          object-fit: cover;
          background: var(--color-surface-alt);
          border: 1px solid var(--color-border);
        }

        .profileFallback {
          display: grid;
          place-items: center;
          font-size: 2.6rem;
          font-weight: 700;
          color: var(--color-text-primary);
          letter-spacing: 0.04em;
        }

        .profileName {
          margin: 0;
          font-size: clamp(1.75rem, 2vw, 2.2rem);
          font-weight: 700;
        }

        .profileRole {
          margin: 0.5rem 0;
          color: #C4B5FD;
          font-weight: 500;
        }

        .profileBio {
          margin: 0.5rem auto 0;
          max-width: 36ch;
          color: var(--color-text-secondary);
          font-weight: 400;
          line-height: 1.6;
        }

        .socials {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .socialLink {
          color: var(--color-text-primary);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          background: rgba(20, 10, 30, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          padding: 0.45rem 0.95rem;
          transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
        }

        .socialLink:hover {
          border-color: #C4B5FD;
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(196, 181, 253, 0.25);
        }

        .divider {
          position: relative;
          z-index: 2;
          pointer-events: none;
          overflow: hidden;
        }

        /* Gradient fade — no hard edge, blends left and right panels */
        .divider::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(107, 59, 142, 0.18) 30%,
            rgba(157, 104, 193, 0.32) 50%,
            rgba(107, 59, 142, 0.18) 70%,
            transparent 100%
          );
        }

        /* Animated light streak */
        .divider::after {
          content: '';
          position: absolute;
          inset: -30% 20%;
          width: 60%;
          background: linear-gradient(
            180deg,
            transparent,
            rgba(196, 181, 253, 0.22),
            rgba(125, 79, 179, 0.28),
            rgba(196, 181, 253, 0.22),
            transparent
          );
          animation: streak 5s linear infinite;
          filter: blur(6px);
        }

        .chatPanel {
          display: grid;
          grid-template-rows: auto 1fr auto;
          z-index: 1;
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
          background: transparent;
        }

        .chatHeader {
          padding: 0.9rem 1.4rem 0.5rem;
          border-bottom: none;
          background: transparent;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .chatTitle {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .chatSubtitle {
          margin: 0.2rem 0 0;
          color: var(--color-text-secondary);
          font-size: 0.88rem;
          font-weight: 500;
        }

        .headerRight {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .statusWrap {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          color: var(--color-text-secondary);
          font-size: 0.85rem;
        }

        .statusDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--color-success);
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.7);
        }

        .clearBtn {
          border: 1px solid var(--color-border);
          background: var(--color-surface-alt);
          color: var(--color-text-primary);
          border-radius: 10px;
          padding: 0.45rem 0.75rem;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
        }

        .clearBtn:hover {
          transform: translateY(-1px);
          border-color: #C4B5FD;
          box-shadow: 0 10px 26px rgba(196, 181, 253, 0.22);
        }

        .messagesContainer {
          min-height: 0;
          overflow-y: auto;
          padding: 1.5rem 1.25rem;
          background: transparent;
          scrollbar-width: none;
        }

        .messagesContainer::-webkit-scrollbar {
          display: none;
          width: 0;
        }

        .messages {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .message {
          max-width: min(78%, 560px);
          border-radius: 16px;
          padding: 0.8rem 0.95rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.24);
          animation: messageIn 250ms ease-in-out;
        }

        .messageMeta {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.72rem;
          color: var(--color-text-secondary);
          margin-bottom: 0.38rem;
        }

        .messageContent {
          white-space: pre-wrap;
          line-height: 1.55;
          color: var(--color-text-primary);
          font-weight: 400;
        }

        .userMessage {
          margin-left: auto;
          background: rgba(107, 59, 142, 0.92);
          color: #fff;
          border-bottom-right-radius: 6px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 24px rgba(107, 59, 142, 0.5);
        }

        .userMessage .messageMeta {
          color: rgba(255, 255, 255, 0.65);
        }

        .assistantMessage {
          margin-right: auto;
          background: rgba(18, 8, 28, 0.88);
          border: 1px solid rgba(196, 181, 253, 0.18);
          border-bottom-left-radius: 6px;
          backdrop-filter: blur(14px);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
        }

        .typing {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .typingDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #C4B5FD;
          animation: blink 1.1s infinite ease-in-out;
        }

        .typingDot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typingDot:nth-child(3) {
          animation-delay: 0.3s;
        }

        .emptyState {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 100%;
          padding: 2rem 1rem;
          gap: 0;
        }

        .emptyTitle {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .emptyText {
          margin: 0.6rem 0 0;
          color: var(--color-text-secondary);
          font-weight: 400;
          max-width: 38ch;
          line-height: 1.55;
        }

        /* ── Follow-ups Right Panel ── */
        .followUpsPanel {
          border-left: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(11, 8, 14, 0.55);
          backdrop-filter: blur(18px);
          display: flex;
          flex-direction: column;
          padding: 1.2rem 0.85rem;
          gap: 0.5rem;
          overflow-y: auto;
          scrollbar-width: none;
          z-index: 1;
          animation: fadeInRight 250ms ease-in-out;
        }

        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .followUpsPanel::-webkit-scrollbar { display: none; }

        .followUpsPanelHeader {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0 0.1rem 0.6rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          margin-bottom: 0.3rem;
        }

        .followUpsPanelIcon {
          font-size: 0.75rem;
          color: #C4B5FD;
        }

        .followUpsPanelTitle {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .followUpsPanelList {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .followUpSideBtn {
          border: 1px solid rgba(196, 181, 253, 0.18);
          background: rgba(18, 8, 28, 0.6);
          color: var(--color-text-primary);
          border-radius: 10px;
          padding: 0.6rem 0.75rem;
          font-size: 0.8rem;
          text-align: left;
          cursor: pointer;
          line-height: 1.35;
          backdrop-filter: blur(10px);
          transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base), background var(--transition-base);
          width: 100%;
        }

        .followUpSideBtn:hover {
          transform: translateX(-3px);
          border-color: #C4B5FD;
          background: rgba(107, 59, 142, 0.3);
          box-shadow: 0 4px 18px rgba(196, 181, 253, 0.15);
        }

        /* ── Contact Bar (inside assistant messages) ── */
        .contactBar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 0.65rem;
          padding-top: 0.55rem;
          border-top: 1px solid rgba(196, 181, 253, 0.12);
        }

        .contactBarText {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }

        .contactBarBtn {
          border: 1px solid rgba(196, 181, 253, 0.4);
          background: rgba(107, 59, 142, 0.22);
          color: #C4B5FD;
          border-radius: 999px;
          padding: 0.28rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform var(--transition-base), background var(--transition-base), box-shadow var(--transition-base);
          white-space: nowrap;
        }

        .contactBarBtn:hover {
          transform: translateY(-1px);
          background: rgba(107, 59, 142, 0.45);
          box-shadow: 0 4px 14px rgba(196, 181, 253, 0.2);
        }

        /* ── Contact Modal ── */
        .contactModalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          z-index: 100;
          display: grid;
          place-items: center;
          animation: fadeIn 200ms ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .contactModalCard {
          background: rgba(20, 10, 30, 0.95);
          border: 1px solid rgba(196, 181, 253, 0.25);
          border-radius: 20px;
          padding: 1.75rem 2rem;
          width: min(480px, 90vw);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
          animation: scaleIn 220ms ease;
        }

        @keyframes scaleIn {
          from { transform: scale(0.92); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }

        .contactModalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.35rem;
        }

        .contactModalTitle {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .contactModalClose {
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: var(--color-text-secondary);
          border-radius: 8px;
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background var(--transition-base), color var(--transition-base);
        }

        .contactModalClose:hover {
          background: rgba(255, 255, 255, 0.14);
          color: var(--color-text-primary);
        }

        .contactModalSub {
          margin: 0 0 1.25rem;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }

        .contactModalOptions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem;
        }

        .contactOption {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          text-decoration: none;
          color: var(--color-text-primary);
          border: 1px solid rgba(196, 181, 253, 0.18);
          background: rgba(18, 8, 28, 0.7);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
          font-weight: 500;
          transition: transform var(--transition-base), border-color var(--transition-base), background var(--transition-base), box-shadow var(--transition-base);
        }

        .contactOption:hover {
          transform: translateY(-2px);
          border-color: #C4B5FD;
          background: rgba(107, 59, 142, 0.3);
          box-shadow: 0 8px 22px rgba(196, 181, 253, 0.18);
        }

        .contactOptionIcon {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(107, 59, 142, 0.3);
          color: #C4B5FD;
          flex-shrink: 0;
        }

        .downloadCvBtn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: none;
          background: linear-gradient(135deg, #6B3B8E 0%, #9D68C1 65%, #C4B5FD 100%);
          color: #fff;
          border-radius: 10px;
          padding: 0.42rem 1rem;
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          letter-spacing: 0.02em;
          box-shadow: 0 3px 14px rgba(107, 59, 142, 0.5);
          transition: transform var(--transition-base), box-shadow var(--transition-base), filter var(--transition-base);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .downloadCvBtn:hover {
          transform: translateY(-2px) scale(1.04);
          filter: brightness(1.12);
          box-shadow: 0 8px 28px rgba(107, 59, 142, 0.65);
        }

        .downloadCvIcon {
          font-size: 0.9rem;
        }

        .composer {
          padding: 0.75rem 1rem 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(8, 4, 16, 0.6);
          backdrop-filter: blur(18px);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .input {
          flex: 1;
          border: 1px solid var(--color-border);
          background: var(--color-surface-alt);
          color: var(--color-text-primary);
          border-radius: 12px;
          padding: 0.75rem 0.9rem;
          font-size: 0.95rem;
          font-weight: 500;
          outline: none;
          transition: border-color var(--transition-base), box-shadow var(--transition-base);
        }

        .input::placeholder {
          color: var(--color-text-secondary);
          opacity: 0.85;
        }

        .input:focus {
          border-color: #C4B5FD;
          box-shadow: 0 0 0 3px rgba(196, 181, 253, 0.22);
        }

        .sendBtn {
          border: none;
          background: var(--color-primary);
          color: var(--color-text-primary);
          border-radius: 12px;
          padding: 0.76rem 1rem;
          min-width: 74px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform var(--transition-base), box-shadow var(--transition-base), filter var(--transition-base);
        }

        .sendBtn:hover:enabled {
          transform: translateY(-2px);
          filter: brightness(1.1);
          box-shadow: 0 14px 28px rgba(107, 59, 142, 0.4);
        }

        .sendBtn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .sendPulse {
          animation: sendPop 180ms ease-out;
        }

        @keyframes messageIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes sendPop {
          0% {
            transform: scale(1);
          }
          45% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 0.25;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes streak {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(200%);
          }
        }

        @keyframes streakH {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        @media (max-width: 1024px) {
          .appShell {
            grid-template-columns: 200px 1fr;
          }
          .appShellWide {
            grid-template-columns: 200px 1fr 200px;
          }
        }

        @media (max-width: 768px) {
          .siteHeaderInner {
            padding: 0 1rem;
            height: 50px;
          }

          .siteNav {
            gap: 0.15rem;
          }

          .siteNavLink {
            padding: 0.3rem 0.6rem;
            font-size: 0.8rem;
          }

          .chatPanel {
            max-width: 100%;
          }

          .message {
            max-width: min(85%, 500px);
            font-size: 0.95rem;
          }

          .messageMeta {
            font-size: 0.7rem;
          }

          .messagesContainer {
            padding: 1.25rem 1rem;
          }

          .composer {
            padding: 0.65rem 0.85rem 0.9rem;
            gap: 0.6rem;
          }

          .input {
            font-size: 0.9rem;
            padding: 0.7rem 0.85rem;
          }

          .sendBtn {
            padding: 0.7rem 0.9rem;
            min-width: 70px;
          }

          .chatTitle {
            font-size: 1.1rem;
          }

          .chatSubtitle {
            font-size: 0.8rem;
          }
        }

        @media (max-width: 640px) {
          /* ── Global padding/sizing ── */
          :global(html), :global(body) {
            font-size: 14px;
          }

          /* ── Shell becomes flex column ── */
          .appShell,
          .appShellWide {
            display: flex;
            flex-direction: column;
            grid-template-columns: unset;
          }

          /* ── Header: more compact ── */
          .siteHeaderInner {
            padding: 0 0.6rem;
            height: 48px;
            gap: 0.5rem;
          }

          .siteHeader {
            flex-shrink: 0;
            z-index: 10;
          }

          .siteLogo {
            gap: 0.5rem;
            flex-shrink: 1;
            min-width: 0;
          }

          .siteLogoMark {
            width: 30px;
            height: 30px;
            font-size: 0.7rem;
          }

          .siteLogoText {
            font-size: 0.85rem;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .siteNav {
            display: flex;
            overflow-x: auto;
            scrollbar-width: none;
            gap: 0.05rem;
            flex-shrink: 1;
            -webkit-overflow-scrolling: touch;
          }

          .siteNav::-webkit-scrollbar { display: none; }

          .siteNavIconLink span:last-child,
          .siteNavLink:not(.siteNavIconLink) span:not(.downloadCvIcon) {
            display: none;
          }

          .siteNavLink {
            padding: 0.3rem 0.5rem;
            font-size: 0.7rem;
            border-radius: 6px;
            flex-shrink: 0;
          }

          .downloadCvBtn {
            padding: 0.35rem 0.55rem;
            min-width: unset;
            font-size: 0.75rem;
            flex-shrink: 0;
          }

          /* ── Left panel → horizontal strip at bottom ── */
          .suggestionsPanel {
            display: flex !important;
            flex-direction: row;
            align-items: center;
            flex-shrink: 0;
            order: 2;
            padding: 0.4rem 0.6rem;
            gap: 0;
            border-right: none;
            border-top: 1px solid rgba(255, 255, 255, 0.07);
            border-bottom: none;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            height: auto;
            max-height: 48px;
          }

          .suggestionsPanel::-webkit-scrollbar { display: none; }

          .suggestionsPanel .suggestionsPanelHeader {
            flex-shrink: 0;
            padding: 0 0.5rem 0 0;
            border-bottom: none;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 0;
            margin-right: 0.5rem;
            gap: 0.2rem;
          }

          .suggestionsPanel .suggestionsPanelTitle {
            white-space: nowrap;
            font-size: 0.65rem;
          }

          .suggestionsPanel .suggestionsPanelIcon { display: none; }

          .suggestionsPanel .suggestionsList {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            gap: 0.35rem;
          }

          .suggestionsPanel .sideSuggestionBtn {
            flex-shrink: 0;
            white-space: nowrap;
            padding: 0.28rem 0.55rem;
            font-size: 0.72rem;
            border-radius: 999px;
            width: auto;
            line-height: 1.2;
          }

          /* ── Right panel → hidden or second strip ── */
          .followUpsPanel {
            display: none !important;
          }

          /* Show follow-ups only when there's space (via inline check) */
          @supports (display: flex) {
            .followUpsPanel {
              display: none !important;
            }
          }

          /* ── Chat panel takes full remaining space ── */
          .chatPanel {
            order: 1;
            flex: 1;
            min-height: 0;
            max-width: 100%;
            margin: 0;
            width: 100%;
          }

          .chatHeader {
            padding: 0.75rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.4rem;
          }

          .chatTitle {
            font-size: 1rem;
            margin-bottom: 0;
          }

          .chatSubtitle {
            font-size: 0.75rem;
            margin: 0;
          }

          .headerRight {
            align-self: flex-end;
            gap: 0.5rem;
          }

          .statusWrap {
            font-size: 0.75rem;
          }

          .clearBtn {
            padding: 0.35rem 0.6rem;
            font-size: 0.75rem;
          }

          .messagesContainer {
            padding: 0.9rem 0.75rem;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }

          .messages {
            gap: 0.75rem;
          }

          .message {
            max-width: min(90%, 100%);
            padding: 0.7rem 0.85rem;
            border-radius: 14px;
            font-size: 0.9rem;
          }

          .messageMeta {
            font-size: 0.65rem;
            gap: 0.6rem;
          }

          .messageContent {
            line-height: 1.5;
            word-break: break-word;
          }

          .emptyTitle {
            font-size: 1.3rem;
          }

          .emptyText {
            font-size: 0.85rem;
          }

          /* ── Input/send improvements ── */
          .composer {
            padding: 0.6rem 0.75rem 0.8rem;
            gap: 0.55rem;
            flex-shrink: 0;
          }

          .input {
            font-size: 0.9rem;
            padding: 0.65rem 0.8rem;
            border-radius: 10px;
            min-height: 40px;
          }

          .sendBtn {
            padding: 0.65rem 0.8rem;
            min-width: 60px;
            font-size: 0.85rem;
            border-radius: 10px;
            flex-shrink: 0;
          }

          /* ── Contact bar ── */
          .contactBar {
            font-size: 0.7rem;
            gap: 0.35rem;
            margin-top: 0.5rem;
            padding-top: 0.4rem;
          }

          .contactBarText {
            font-size: 0.7rem;
          }

          .contactBarBtn {
            padding: 0.25rem 0.6rem;
            font-size: 0.7rem;
          }

          /* ── Contact modal ── */
          .contactModalCard {
            width: min(95vw, 340px);
            padding: 1.25rem 1.5rem;
            border-radius: 16px;
          }

          .contactModalTitle {
            font-size: 1rem;
          }

          .contactModalSub {
            font-size: 0.8rem;
            margin-bottom: 1rem;
          }

          .contactModalOptions {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .contactOption {
            padding: 0.65rem 0.9rem;
            font-size: 0.85rem;
            gap: 0.5rem;
          }

          .contactOptionIcon {
            width: 28px;
            height: 28px;
          }

          /* ── Footer: more compact ── */
          .siteFooterInner {
            padding: 0 0.6rem;
            height: 40px;
            font-size: 0.7rem;
          }

          .footerRight {
            display: none;
          }

          .footerLeft {
            font-size: 0.7rem;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* ── Particle canvas: disable on mobile ── */
          .particleCanvas {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .chatHeader {
            padding: 0.65rem;
          }

          .messagesContainer {
            padding: 0.75rem 0.6rem;
          }

          .composer {
            padding: 0.55rem 0.65rem;
          }

          .input {
            font-size: 16px;
            padding: 0.6rem 0.75rem;
          }

          .message {
            max-width: 95%;
            padding: 0.6rem 0.75rem;
            font-size: 0.88rem;
          }

          .siteLogo {
            gap: 0.3rem;
          }

          .siteLogoMark {
            width: 28px;
            height: 28px;
          }

          .siteLogoText {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
