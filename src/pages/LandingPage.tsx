import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight, BarChart3, BookOpen, Building2, CheckCircle2, ChevronRight,
  GraduationCap, Menu, Orbit, ShieldCheck, Sparkles, Users, X, Zap,
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const modules = [
  { icon: GraduationCap, label: "Student lifecycle", text: "Admissions, profiles, attendance, results, and graduation in one continuous record.", tone: "lime" },
  { icon: BookOpen, label: "Academic command", text: "Courses, timetables, assignments, examinations, and faculty workflows that stay in sync.", tone: "blue" },
  { icon: BarChart3, label: "Institutional intelligence", text: "Live dashboards turn campus activity into decisions leadership can act on immediately.", tone: "coral" },
  { icon: Building2, label: "Campus operations", text: "Finance, hostel, library, canteen, placements, and communication—connected by design.", tone: "violet" },
];

const roles = [
  ["01", "Students", "A clear home for learning, schedules, payments, opportunities, and campus life."],
  ["02", "Faculty", "Less administration. More time to teach, guide, assess, and support progress."],
  ["03", "Leadership", "A real-time view of performance, operations, risk, and institutional momentum."],
];

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 55 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .18 }} transition={{ duration: .75, delay, ease }}>{children}</motion.div>;
}

function CampusCore() {
  return (
    <div className="cn-core-wrap" aria-label="Animated connected campus system">
      <div className="cn-core-glow" />
      <motion.div className="cn-orbit cn-orbit-a" animate={{ rotateZ: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}><i /><i /></motion.div>
      <motion.div className="cn-orbit cn-orbit-b" animate={{ rotateZ: -360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}><i /><i /><i /></motion.div>
      <motion.div className="cn-orbit cn-orbit-c" animate={{ rotateZ: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}><i /></motion.div>
      <motion.div className="cn-core-cube" animate={{ rotateX: [58, 66, 58], rotateZ: [42, 48, 42], y: [0, -14, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
        <div className="cn-cube-face cn-face-front">CN</div><div className="cn-cube-face cn-face-back" />
        <div className="cn-cube-face cn-face-right" /><div className="cn-cube-face cn-face-left" />
        <div className="cn-cube-face cn-face-top" /><div className="cn-cube-face cn-face-bottom" />
      </motion.div>
      <motion.div className="cn-float-card cn-card-students" animate={{ y: [0, -12, 0], rotate: [-2, 1, -2] }} transition={{ duration: 5, repeat: Infinity }}><Users /><span>ACTIVE STUDENTS</span><strong>12,480</strong><small>+8.4% this term</small></motion.div>
      <motion.div className="cn-float-card cn-card-attendance" animate={{ y: [0, 10, 0], rotate: [2, -1, 2] }} transition={{ duration: 6, repeat: Infinity }}><CheckCircle2 /><span>ATTENDANCE</span><strong>94.8%</strong><small>Live across campus</small></motion.div>
      <div className="cn-core-label">LIVE CAMPUS NETWORK <span>●</span></div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28 });
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroTextY = useTransform(heroProgress, [0, 1], [0, 150]);
  const coreY = useTransform(heroProgress, [0, 1], [0, -110]);
  const coreRotate = useTransform(heroProgress, [0, 1], [0, 16]);

  return (
    <main className="cn-site">
      <motion.div className="cn-progress" style={{ scaleX: progress }} />
      <div className="cn-noise" />
      <nav className="cn-nav">
        <Link to="/" className="cn-logo"><span>C</span><b>CAMPUSNEX</b></Link>
        <div className={`cn-links ${menuOpen ? "open" : ""}`}><a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a><a href="#experience" onClick={() => setMenuOpen(false)}>Experience</a><a href="#roles" onClick={() => setMenuOpen(false)}>For everyone</a><Link to="/auth" className="cn-mobile-signin">Sign in <ArrowRight /></Link></div>
        <div className="cn-nav-actions"><Link to="/auth" className="cn-signin">Sign in</Link><Link to="/apply-institution" className="cn-nav-button">Book a walkthrough <ArrowRight /></Link><button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button></div>
      </nav>

      <section className="cn-hero" ref={heroRef}>
        <div className="cn-grid" />
        <motion.div className="cn-hero-copy" style={{ y: heroTextY }}>
          <motion.div className="cn-eyebrow" initial={{ opacity: 0, x: -25 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7 }}><i /> CAMPUS INTELLIGENCE, BEAUTIFULLY CONNECTED</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 45 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .1, ease }}>Run your entire<br />campus from <em>one<br />living system.</em></motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .45 }}>CampusNex unifies every student, team, workflow, and decision—giving modern institutions the clarity to move forward together.</motion.p>
          <motion.div className="cn-hero-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .6 }}><Link to="/auth" className="cn-button-primary">Enter CampusNex <ArrowRight /></Link><a href="#platform" className="cn-button-ghost">Explore the system <ChevronRight /></a></motion.div>
          <motion.div className="cn-proof" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .8 }}><ShieldCheck /><span>Secure by design</span><i /><Zap /><span>Built for real-time operations</span></motion.div>
        </motion.div>
        <motion.div className="cn-hero-visual" style={{ y: coreY, rotate: coreRotate }} initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: .2, ease }}><CampusCore /></motion.div>
        <div className="cn-scroll"><span>SCROLL TO DISCOVER</span><i /></div>
      </section>

      <section className="cn-signal"><span>ONE PLATFORM</span><b>Academics</b><i /> <b>Operations</b><i /> <b>Finance</b><i /> <b>Placements</b><i /> <b>Student life</b></section>

      <section className="cn-intro" id="platform">
        <Reveal className="cn-intro-top"><div className="cn-section-label">01 / THE PLATFORM</div><h2>A campus should feel<br /><em>connected.</em></h2><p>Not like a collection of portals. CampusNex creates one coherent digital environment where information flows, work moves, and every role stays aligned.</p></Reveal>
        <div className="cn-module-grid">{modules.map(({ icon: Icon, label, text, tone }, index) => <Reveal key={label} delay={index * .1}><motion.article className={`cn-module cn-${tone}`} whileHover={{ y: -12, rotateX: 3, rotateY: index % 2 ? -3 : 3 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}><div><span>0{index + 1}</span><Icon /></div><h3>{label}</h3><p>{text}</p><ArrowRight /></motion.article></Reveal>)}</div>
      </section>

      <section className="cn-experience" id="experience">
        <Reveal className="cn-experience-copy"><div className="cn-section-label">02 / ALWAYS IN MOTION</div><h2>See what matters.<br /><em>Before it becomes urgent.</em></h2><p>A shared operational pulse reveals progress, exceptions, and opportunities while there is still time to act.</p><ul><li><CheckCircle2 /> Live institutional dashboards</li><li><CheckCircle2 /> Automated alerts and approvals</li><li><CheckCircle2 /> Connected records across departments</li></ul><Link to="/auth" className="cn-button-primary">See your command center <ArrowRight /></Link></Reveal>
        <Reveal className="cn-console" delay={.15}><div className="cn-console-bar"><i /><i /><i /><span>CAMPUSNEX / LIVE OVERVIEW</span></div><div className="cn-console-body"><aside><b>C</b><i /><i /><i /><i /></aside><div className="cn-console-main"><header><div><small>INSTITUTION OVERVIEW</small><h3>Your campus, right now.</h3></div><span>LIVE</span></header><div className="cn-console-stats"><div><small>ENROLMENT</small><strong>12,480</strong><em>+8.4%</em></div><div><small>ATTENDANCE</small><strong>94.8%</strong><em>+2.1%</em></div><div><small>PLACEMENT RATE</small><strong>86%</strong><em>+6.7%</em></div></div><div className="cn-console-chart"><div><span>ACTIVITY SIGNAL</span><b>LAST 12 MONTHS</b></div><svg viewBox="0 0 600 180" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dfff56" stopOpacity=".35"/><stop offset="1" stopColor="#dfff56" stopOpacity="0"/></linearGradient></defs><path d="M0 145 C55 130 70 75 125 105 S210 145 250 82 S335 25 380 70 S465 125 520 45 S575 30 600 15 L600 180 L0 180Z" fill="url(#area)"/><path d="M0 145 C55 130 70 75 125 105 S210 145 250 82 S335 25 380 70 S465 125 520 45 S575 30 600 15" fill="none" stroke="#dfff56" strokeWidth="3"/></svg></div></div></div></Reveal>
      </section>

      <section className="cn-roles" id="roles"><Reveal><div className="cn-section-label">03 / BUILT FOR EVERYONE</div><h2>One system.<br /><em>Every perspective.</em></h2></Reveal><div className="cn-role-list">{roles.map(([number, title, text], index) => <motion.article key={title} initial={{ opacity: 0, x: index % 2 ? 60 : -60 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .4 }} transition={{ duration: .7, delay: index * .08, ease }}><span>{number}</span><h3>{title}</h3><p>{text}</p><ArrowRight /></motion.article>)}</div></section>

      <section className="cn-final"><div className="cn-final-orbit"><Orbit /></div><Reveal><div className="cn-section-label">04 / YOUR NEXT CHAPTER</div><h2>Give your campus<br />a system built to <em>move.</em></h2><p>Step into a clearer, faster, more connected way to run your institution.</p><div><Link to="/apply-institution" className="cn-button-primary">Start with CampusNex <ArrowRight /></Link><Link to="/auth" className="cn-button-ghost">Sign in</Link></div></Reveal></section>

      <footer className="cn-footer"><Link to="/" className="cn-logo"><span>C</span><b>CAMPUSNEX</b></Link><div><a href="#platform">Platform</a><a href="#experience">Experience</a><a href="#roles">For everyone</a></div><p>© 2026 CampusNex. All rights reserved.</p><a className="cn-norynt" href="https://www.norynt.app" target="_blank" rel="noreferrer">DEVELOPED BY <strong>NORYNT</strong> <ArrowRight /></a></footer>
    </main>
  );
}
