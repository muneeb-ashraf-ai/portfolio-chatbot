import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendPulse, setSendPulse] = useState(false);
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
              <a href="https://muneeb-ashraf.vercel.app/" target="_blank" rel="noopener noreferrer" className="siteNavLink">Portfolio</a>
              <a href="https://github.com/alphaaa-m" target="_blank" rel="noopener noreferrer" className="siteNavLink">GitHub</a>
              <a href="https://www.linkedin.com/in/muneeb-ashraf-ai/" target="_blank" rel="noopener noreferrer" className="siteNavLink">LinkedIn</a>
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
        <div className="appShell">
          <canvas ref={canvasRef} className="particleCanvas" />
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
                <div className="emptyAvatar">α</div>
                <h3 className="emptyTitle">Hi! I'm Alpha 👋</h3>
                <p className="emptyText">Muneeb's personal AI assistant. Try one of these to get started:</p>
                <div className="suggestions">
                  <button onClick={() => sendText("Who is Muneeb?")} className="suggestionBtn">🙋 Who is Muneeb?</button>
                  <button onClick={() => sendText("What are Muneeb's skills?")} className="suggestionBtn">⚡ What are Muneeb's skills?</button>
                  <button onClick={() => sendText("Who are you?")} className="suggestionBtn">🤖 Who are you?</button>
                  <button onClick={() => sendText("What projects has Muneeb worked on?")} className="suggestionBtn">🚀 What projects has Muneeb worked on?</button>
                  <button onClick={() => sendText("What is Muneeb's educational background?")} className="suggestionBtn">🎓 What is Muneeb's educational background?</button>
                </div>
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
                    </article>
                    {msg.role === 'assistant' && msg.followUps && msg.followUps.length > 0 && (
                      <div className="followUpsWrap">
                        <span className="followUpsLabel">You might want to ask:</span>
                        <div className="followUpsList">
                          {msg.followUps.map((q, qi) => (
                            <button key={qi} className="followUpBtn" onClick={() => sendText(q)}>
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
      </div>

        {/* ── Global Footer ── */}
        <footer className="siteFooter">
          <div className="siteFooterInner">
            <span className="footerLeft">© 2025 Muneeb Ashraf · All rights reserved</span>
            <span className="footerRight">Powered by RAG</span>
          </div>
        </footer>

      </div>

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

        /* ── Single-panel layout ── */
        .appShell {
          min-height: 0;
          height: 100%;
          width: 100%;
          background: transparent;
          display: grid;
          grid-template-columns: 1fr;
          overflow: hidden;
          position: relative;
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
          scrollbar-width: thin;
          scrollbar-color: rgba(157, 104, 193, 0.5) transparent;
        }

        .messagesContainer::-webkit-scrollbar {
          width: 4px;
        }

        .messagesContainer::-webkit-scrollbar-track {
          background: transparent;
        }

        .messagesContainer::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(107, 59, 142, 0.7) 0%, rgba(196, 181, 253, 0.5) 100%);
          border-radius: 999px;
        }

        .messagesContainer::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(107, 59, 142, 1) 0%, rgba(196, 181, 253, 0.85) 100%);
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

        .emptyAvatar {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          display: grid;
          place-items: center;
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          margin: 0 auto 1rem;
          box-shadow: 0 0 40px rgba(196, 181, 253, 0.35);
        }

        .emptyTitle {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .emptyText {
          margin: 0.6rem 0 1.4rem;
          color: var(--color-text-secondary);
          font-weight: 400;
        }

        .suggestions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem;
          width: min(600px, 100%);
        }

        .suggestionBtn {
          border: 1px solid rgba(196, 181, 253, 0.25);
          background: rgba(18, 8, 28, 0.75);
          color: var(--color-text-primary);
          border-radius: 12px;
          padding: 0.78rem 0.95rem;
          font-size: 0.9rem;
          text-align: left;
          cursor: pointer;
          backdrop-filter: blur(12px);
          transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base), background var(--transition-base);
          line-height: 1.4;
        }

        .suggestionBtn:hover {
          transform: translateY(-2px);
          border-color: #C4B5FD;
          background: rgba(107, 59, 142, 0.35);
          box-shadow: 0 12px 30px rgba(196, 181, 253, 0.2);
        }

        /* Follow-up questions */
        .followUpsWrap {
          margin: 0.35rem 0 0.6rem 0;
          padding-left: 0.2rem;
        }

        .followUpsLabel {
          display: block;
          font-size: 0.72rem;
          color: var(--color-text-secondary);
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .followUpsList {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .followUpBtn {
          border: 1px solid rgba(196, 181, 253, 0.35);
          background: rgba(107, 59, 142, 0.18);
          color: #C4B5FD;
          border-radius: 999px;
          padding: 0.38rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base), border-color var(--transition-base);
          white-space: nowrap;
        }

        .followUpBtn:hover {
          transform: translateY(-1px);
          background: rgba(107, 59, 142, 0.38);
          border-color: #C4B5FD;
          box-shadow: 0 6px 18px rgba(196, 181, 253, 0.2);
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
          .chatPanel {
            max-width: 100%;
          }
        }

        @media (max-width: 640px) {
          .siteHeaderInner,
          .siteFooterInner {
            padding: 0 1rem;
          }

          .siteNav {
            display: none;
          }

          .footerRight {
            display: none;
          }

          .chatHeader {
            padding: 1rem;
          }

          .headerRight {
            gap: 0.5rem;
          }

          .messagesContainer {
            padding: 1rem 0.8rem;
          }

          .message {
            max-width: 92%;
          }

          .suggestions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
