"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight, AudioLines, Check, CheckCircle2, ChevronRight, Circle,
  Clock3, FileAudio, FolderClock, LogOut, Menu, Mic, PanelLeftClose,
  Plus, Search, Settings2, Square, UserRound, X, Zap,
} from "lucide-react";

import { checkServiceAvailability, summarizeMeeting } from "@/src/lib/api";
import { getSupabase, isSupabaseConfigured } from "@/src/lib/supabase";
import type { Meeting, MeetingTask, Plan, SummaryResult } from "@/src/lib/types";

type View = "workspace" | "library" | "tasks" | "billing";

const NAV_ITEMS: { id: View; label: string; icon: typeof Mic }[] = [
  { id: "workspace", label: "Phòng họp", icon: AudioLines },
  { id: "library", label: "Biên bản", icon: FolderClock },
  { id: "tasks", label: "Đầu việc", icon: CheckCircle2 },
  { id: "billing", label: "Gói tài khoản", icon: Zap },
];

const PLAN_LIMITS: Record<Plan, number> = { free: 5, pro: 100, team: 500 };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export default function Home() {
  const [view, setView] = useState<View>("workspace");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [used, setUsed] = useState(0);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"audio" | "text">("audio");
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configured = isSupabaseConfigured();

  const loadWorkspace = useCallback(async (currentUser: User) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const [meetingResult, subscriptionResult, usageResult] = await Promise.all([
      supabase.from("meetings").select("*, tasks(*)").order("created_at", { ascending: false }).limit(100),
      supabase.from("subscriptions").select("plan").eq("user_id", currentUser.id).maybeSingle(),
      supabase.from("usage_events").select("id", { count: "exact", head: true }).eq("user_id", currentUser.id).eq("status", "completed").gte("created_at", monthStart.toISOString()),
    ]);
    if (meetingResult.error || subscriptionResult.error || usageResult.error) {
      setNotice("Không thể đồng bộ dữ liệu tài khoản. Vui lòng thử lại.");
    }
    const loaded = (meetingResult.data || []) as Meeting[];
    setMeetings(loaded);
    setSelectedId((current) => loaded.some((meeting) => meeting.id === current) ? current : loaded[0]?.id || null);
    setPlan((subscriptionResult.data?.plan as Plan) || "free");
    setUsed(usageResult.count || 0);
  }, []);

  useEffect(() => {
    let active = true;
    checkServiceAvailability().then((online) => active && setAiOnline(online));
    const supabase = getSupabase();
    if (!supabase) return () => { active = false; };
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const current = data.session?.user || null;
      setUser(current);
      if (current) void loadWorkspace(current);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      if (nextUser) void loadWorkspace(nextUser);
      else {
        setMeetings([]);
        setSelectedId(null);
        setPlan("free");
        setUsed(0);
      }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [loadWorkspace]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !user) return;
    const refresh = () => { void loadWorkspace(user); };
    const channel = supabase
      .channel(`workspace:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings", filter: `user_id=eq.${user.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadWorkspace, user]);

  useEffect(() => {
    const readHash = () => {
      const target = window.location.hash.replace(/^#\/?/, "") as View;
      if (NAV_ITEMS.some((item) => item.id === target)) setView(target);
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  const visibleMeetings = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi-VN");
    return meetings.filter((meeting) => meeting.title.toLocaleLowerCase("vi-VN").includes(keyword));
  }, [meetings, search]);
  const selected = visibleMeetings.find((meeting) => meeting.id === selectedId) || visibleMeetings[0] || null;
  const allTasks = useMemo(() => meetings.flatMap((meeting) => meeting.tasks.map((task) => ({ ...task, meetingTitle: meeting.title }))), [meetings]);

  async function signIn() {
    const supabase = getSupabase();
    if (!supabase) return setNotice("Hãy điền cấu hình Supabase trong .env.local trước.");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) setNotice(error.message);
  }

  async function signOut() {
    await getSupabase()?.auth.signOut();
    setUser(null);
    setMeetings([]);
    setSelectedId(null);
  }

  async function saveResult(result: SummaryResult, source: "text" | "audio", duration = 0) {
    const supabase = getSupabase();
    if (!supabase || !user) return;
    const { data, error } = await supabase.rpc("save_meeting_with_tasks", {
      p_title: result.title,
      p_summary: result.summary,
      p_key_points: result.key_points,
      p_recommendations: result.recommendations,
      p_source: source,
      p_duration_seconds: duration,
      p_tasks: result.tasks,
    });
    if (error || !data) throw new Error(error?.message || "Không lưu được biên bản.");
    await loadWorkspace(user);
    setSelectedId(String(data));
    setUsed(result.usage.used);
    setView("library");
  }

  async function analyze(payload: { text?: string; audio?: string; mimeType?: string }, source: "text" | "audio", duration = 0) {
    if (!user) return setNotice("Đăng nhập Google để tạo và lưu biên bản của riêng anh.");
    const session = await getSupabase()?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) return setNotice("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
    setProcessing(true);
    setNotice(null);
    try {
      const result = await summarizeMeeting({ token, ...payload });
      await saveResult(result, source, duration);
      setInput("");
      setNotice("Biên bản đã sẵn sàng và được lưu an toàn.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể xử lý cuộc họp.");
    } finally {
      setProcessing(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      const recorder = recorderRef.current;
      if (!recorder) return;
      const duration = seconds;
      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      });
      recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      setRecording(false);
      const blob = await done;
      if (blob.size < 1000) return setNotice("Bản ghi quá ngắn. Hãy thử lại.");
      await analyze({ audio: await blobToBase64(blob), mimeType: blob.type.split(";")[0] }, "audio", duration);
      return;
    }
    if (!user) return setNotice("Đăng nhập Google trước khi bắt đầu ghi âm.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data);
      recorder.start(1000);
      recorderRef.current = recorder;
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch {
      setNotice("Trình duyệt chưa được cấp quyền microphone.");
    }
  }

  async function toggleTask(task: MeetingTask) {
    if (!user || !task.id) return;
    const next = task.status === "done" ? "todo" : "done";
    const { error } = await getSupabase()!.from("tasks").update({ status: next }).eq("id", task.id);
    if (error) return setNotice(error.message);
    await loadWorkspace(user);
  }

  async function requestUpgrade(target: Plan) {
    if (!user) return setNotice("Đăng nhập để gửi yêu cầu nâng cấp.");
    const { error } = await getSupabase()!.from("upgrade_requests").insert({ user_id: user.id, requested_plan: target });
    setNotice(error ? (error.code === "23505" ? "Yêu cầu nâng cấp của anh đang được xử lý." : error.message) : "Đã ghi nhận yêu cầu. Đội ngũ sẽ liên hệ để kích hoạt gói.");
  }

  return (
    <div className="app-shell">
      <AnimatePresence>{sidebarOpen && <motion.button aria-label="Đóng menu" className="sidebar-scrim" onClick={() => setSidebarOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
      <motion.aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`} initial={{ x: -18, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: .38 }}>
        <div className="brand-row"><div className="brand-mark">HX</div><div><strong>HỌP XONG</strong><span>Biên bản bằng AI</span></div><button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={19} /></button></div>
        <button className="new-meeting" onClick={() => { setView("workspace"); setMode("audio"); setSidebarOpen(false); }}><Plus size={18} /> Cuộc họp mới <span>⌘ N</span></button>
        <nav>{NAV_ITEMS.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setSidebarOpen(false); }}><item.icon size={18} />{item.label}{item.id === "tasks" && allTasks.filter((task) => task.status !== "done").length > 0 && <em>{allTasks.filter((task) => task.status !== "done").length}</em>}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="plan-meter"><div><span>Gói {plan === "free" ? "Miễn phí" : plan.toUpperCase()}</span><b>{used}/{PLAN_LIMITS[plan]}</b></div><i><span style={{ width: `${Math.min(100, used / PLAN_LIMITS[plan] * 100)}%` }} /></i><button onClick={() => setView("billing")}>Nâng cấp hạn mức <ArrowRight size={14} /></button></div>
          {user ? <div className="account"><div className="avatar">{(user.user_metadata?.full_name || user.email || "U").slice(0, 1).toUpperCase()}</div><div><strong>{user.user_metadata?.full_name || "Tài khoản"}</strong><span>{user.email}</span></div><button className="icon-button" onClick={signOut} aria-label="Đăng xuất"><LogOut size={17} /></button></div> : <button className="sign-in" onClick={signIn}><UserRound size={17} /> Đăng nhập với Google</button>}
        </div>
      </motion.aside>

      <main className="main-area">
        <header className="topbar"><button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div className="mobile-brand">HỌP XONG</div><div className="service-state"><span className={aiOnline ? "online" : "offline"} />{aiOnline === null ? "Đang kiểm tra" : aiOnline ? "AI sẵn sàng" : "Dịch vụ AI gián đoạn"}</div><button className="icon-button" onClick={() => setView("billing")} aria-label="Cấu hình tài khoản"><Settings2 size={18} /></button></header>
        {!configured && <div className="setup-banner"><span>Dịch vụ dữ liệu chưa sẵn sàng. Vui lòng liên hệ quản trị viên.</span></div>}
        <AnimatePresence>{notice && <motion.div className="notice" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}><span>{notice}</span><button onClick={() => setNotice(null)}><X size={16} /></button></motion.div>}</AnimatePresence>

        <motion.div key={view} className="view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
            {view === "workspace" && <WorkspaceView mode={mode} setMode={setMode} input={input} setInput={setInput} recording={recording} seconds={seconds} processing={processing} toggleRecording={toggleRecording} analyzeText={() => analyze({ text: input }, "text")} used={used} plan={plan} aiOnline={aiOnline} />}
            {view === "library" && <LibraryView meetings={visibleMeetings} selected={selected} selectedId={selectedId} setSelectedId={setSelectedId} search={search} setSearch={setSearch} authenticated={Boolean(user)} />}
            {view === "tasks" && <TasksView tasks={allTasks} toggleTask={toggleTask} />}
            {view === "billing" && <BillingView currentPlan={plan} requestUpgrade={requestUpgrade} />}
        </motion.div>
      </main>
    </div>
  );
}

function WorkspaceView({ mode, setMode, input, setInput, recording, seconds, processing, toggleRecording, analyzeText, used, plan, aiOnline }: {
  mode: "audio" | "text"; setMode: (mode: "audio" | "text") => void; input: string; setInput: (value: string) => void;
  recording: boolean; seconds: number; processing: boolean; toggleRecording: () => void; analyzeText: () => void; used: number; plan: Plan; aiOnline: boolean | null;
}) {
  return <div className="workspace-grid"><section className="capture-zone"><div className="section-heading"><div><span className="eyebrow">PHÒNG HỌP</span><h1>Ghi âm cuộc họp.<br />Có báo cáo ngay.</h1></div><div className="mode-switch"><button className={mode === "audio" ? "active" : ""} onClick={() => setMode("audio")}><Mic size={16} /> Ghi âm</button><button className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}><FileAudio size={16} /> Dán nội dung</button></div></div>
    {mode === "audio" ? <div className="recorder-stage"><motion.button className={`record-button ${recording ? "is-recording" : ""}`} onClick={toggleRecording} disabled={processing || aiOnline === false} whileTap={{ scale: .96 }}>{recording ? <Square size={30} fill="currentColor" /> : <Mic size={36} />}{recording && <motion.i animate={{ scale: [1, 1.22], opacity: [.34, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} />}</motion.button><strong>{processing ? "AI đang biên soạn…" : recording ? formatDuration(seconds) : "Chạm để bắt đầu ghi"}</strong><p>{recording ? "Hãy để thiết bị ở gần người nói. Bản ghi chỉ được gửi để phân tích." : "Hỗ trợ cuộc họp tiếng Việt · âm thanh không được lưu mặc định"}</p><div className="waveform" aria-hidden>{Array.from({ length: 54 }).map((_, index) => <motion.span key={index} animate={recording ? { height: [5, 10 + (index * 13) % 34, 6] } : { height: 5 }} transition={{ repeat: recording ? Infinity : 0, duration: .7 + (index % 6) / 10, delay: index / 120 }} />)}</div></div> : <div className="text-stage"><textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={120000} placeholder="Dán transcript, ghi chú hoặc nội dung thảo luận tại đây…" /><div><span>{input.length.toLocaleString("vi-VN")} / 120.000 ký tự</span><button onClick={analyzeText} disabled={processing || input.trim().length < 30 || aiOnline === false}>{processing ? "Đang phân tích…" : "Tạo biên bản"}<ArrowRight size={17} /></button></div></div>}
  </section><aside className="context-rail"><div className="rail-title"><span>THÁNG NÀY</span><b>{used}<small>/{PLAN_LIMITS[plan]} lượt</small></b></div><div className="usage-line"><span style={{ width: `${Math.min(100, used / PLAN_LIMITS[plan] * 100)}%` }} /></div><div className="privacy-note"><div><Check size={15} /> Dữ liệu tách biệt theo tài khoản</div><div><Check size={15} /> Quyền truy cập được kiểm soát</div><div><Check size={15} /> Khóa AI được bảo vệ phía máy chủ</div></div><div className="workflow"><span>SAU KHI XỬ LÝ</span><ol><li><b>01</b> Tóm tắt điều hành</li><li><b>02</b> Quyết định & điểm chính</li><li><b>03</b> Đầu việc có người phụ trách</li></ol></div></aside></div>;
}

function LibraryView({ meetings, selected, selectedId, setSelectedId, search, setSearch, authenticated }: { meetings: Meeting[]; selected: Meeting | null; selectedId: string | null; setSelectedId: (id: string) => void; search: string; setSearch: (value: string) => void; authenticated: boolean }) {
  return <div className="library-layout"><section className="meeting-list"><div className="list-header"><div><span className="eyebrow">THƯ VIỆN</span><h1>Biên bản</h1></div><label><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm cuộc họp" /></label></div><div className="meeting-rows">{meetings.map((meeting) => <button key={meeting.id} className={meeting.id === selectedId ? "active" : ""} onClick={() => setSelectedId(meeting.id)}><div><strong>{meeting.title}</strong><p>{meeting.summary}</p><span><Clock3 size={13} /> {formatDate(meeting.created_at)} · {meeting.tasks.length} đầu việc</span></div><ChevronRight size={18} /></button>)}{meetings.length === 0 && <div className="empty-list"><strong>{authenticated ? "Chưa có biên bản" : "Đăng nhập để xem dữ liệu"}</strong><p>{authenticated ? "Biên bản mới sẽ xuất hiện tại đây sau khi xử lý cuộc họp đầu tiên." : "Dữ liệu cuộc họp chỉ hiển thị sau khi xác thực tài khoản."}</p></div>}</div></section><MeetingDetail meeting={selected} /></div>;
}

function MeetingDetail({ meeting }: { meeting: Meeting | null }) {
  if (!meeting) return <article className="meeting-detail empty-detail"><FolderClock size={26} /><span className="eyebrow">BIÊN BẢN CUỘC HỌP</span><h2>Chưa có dữ liệu để hiển thị.</h2><p>Ghi âm hoặc dán nội dung cuộc họp để tạo biên bản đầu tiên.</p></article>;
  return <article className="meeting-detail"><header><div><span className="eyebrow">BIÊN BẢN CUỘC HỌP</span><h2>{meeting.title}</h2><p>{formatDate(meeting.created_at)} · {meeting.source === "audio" ? formatDuration(meeting.duration_seconds) : "Nội dung văn bản"}</p></div><button className="export-button" onClick={() => window.print()}>Xuất PDF <ArrowRight size={16} /></button></header><section><span className="section-number">01</span><div><h3>Tóm tắt điều hành</h3><p>{meeting.summary}</p></div></section><section><span className="section-number">02</span><div><h3>Điểm chính</h3><ul className="key-points">{meeting.key_points.map((point, index) => <li key={index}><span>{index + 1}</span>{point}</li>)}</ul></div></section><section><span className="section-number">03</span><div><h3>Đầu việc</h3><div className="detail-tasks">{meeting.tasks.map((task, index) => <div key={task.id || index}><Circle size={16} /><p><strong>{task.title}</strong><span>{task.assignee} · {task.deadline || "Chưa có hạn"}</span></p><em className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</em></div>)}</div></div></section></article>;
}

function TasksView({ tasks, toggleTask }: { tasks: (MeetingTask & { meetingTitle: string })[]; toggleTask: (task: MeetingTask) => void }) {
  return <section className="tasks-view"><div className="page-title"><span className="eyebrow">THEO DÕI</span><h1>Đầu việc</h1><p>{tasks.filter((task) => task.status !== "done").length} việc đang mở từ {new Set(tasks.map((task) => task.meetingTitle)).size} cuộc họp.</p></div><div className="task-table"><div className="task-head"><span>Công việc</span><span>Phụ trách</span><span>Hạn chót</span><span>Ưu tiên</span></div>{tasks.map((task, index) => <button key={task.id || index} onClick={() => toggleTask(task)} className={task.status === "done" ? "done" : ""}><span className="task-name">{task.status === "done" ? <CheckCircle2 size={19} /> : <Circle size={19} />}<span><strong>{task.title}</strong><small>{task.meetingTitle}</small></span></span><span>{task.assignee}</span><span>{task.deadline || "Chưa đặt"}</span><span><em className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</em></span></button>)}{tasks.length === 0 && <div className="empty-table"><strong>Chưa có đầu việc</strong><p>Các đầu việc được trích xuất từ dữ liệu cuộc họp thật sẽ xuất hiện tại đây.</p></div>}</div></section>;
}

function BillingView({ currentPlan, requestUpgrade }: { currentPlan: Plan; requestUpgrade: (plan: Plan) => void }) {
  const plans: { id: Plan; name: string; price: string; note: string; features: string[] }[] = [
    { id: "free", name: "Khởi động", price: "0đ", note: "Cho cá nhân trải nghiệm", features: ["5 biên bản mỗi tháng", "Tóm tắt & đầu việc", "Thư viện biên bản cá nhân"] },
    { id: "pro", name: "Chuyên nghiệp", price: "249.000đ", note: "Cho chuyên gia và quản lý", features: ["100 biên bản mỗi tháng", "Ghi âm hoặc nhập văn bản", "Xuất biên bản PDF"] },
    { id: "team", name: "Đội ngũ", price: "799.000đ", note: "Cho nhóm có nhiều cuộc họp", features: ["500 biên bản mỗi tháng", "Theo dõi đầu việc tập trung", "Dữ liệu tách biệt theo tài khoản"] },
  ];
  return <section className="billing-view"><div className="page-title"><span className="eyebrow">GÓI TÀI KHOẢN</span><h1>Giá rõ ràng.<br />Giá trị đo được.</h1><p>Bắt đầu miễn phí, chỉ nâng cấp khi Họp Xong đã tiết kiệm thời gian cho đội ngũ.</p></div><div className="pricing-grid">{plans.map((item) => <article key={item.id} className={item.id === "pro" ? "featured" : ""}><div><span>{item.name}</span>{item.id === "pro" && <em>PHỔ BIẾN</em>}</div><strong>{item.price}<small>{item.id !== "free" && "/tháng"}</small></strong><p>{item.note}</p><ul>{item.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><button disabled={currentPlan === item.id} onClick={() => requestUpgrade(item.id)}>{currentPlan === item.id ? "Gói hiện tại" : item.id === "free" ? "Bắt đầu miễn phí" : "Yêu cầu nâng cấp"}</button></article>)}</div><div className="value-note"><div><Zap size={20} /></div><div><strong>Tập trung vào kết quả sau cuộc họp</strong><p>Mỗi biên bản liên kết trực tiếp với quyết định, người phụ trách và hạn hoàn thành để đội ngũ theo dõi trong một nơi.</p></div></div></section>;
}
