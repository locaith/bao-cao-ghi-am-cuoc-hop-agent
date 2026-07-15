"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, MicOff, Calendar, Mail, FileText, CheckCircle2, Circle, Trash2, 
  Settings, Globe, Moon, Sun, AlertCircle, Download, Upload, Plus, 
  Search, Shield, Activity, Share2, LogIn, LogOut, Check, ChevronRight,
  Info, RefreshCw, Layers, Sparkles, Lightbulb
} from "lucide-react";
import { initAuth, googleSignIn, logout, getAccessToken } from "../lib/firebase";
import { useMobile } from "../hooks/use-mobile";

// Types
interface Task {
  id: string;
  title: string;
  assignee: string;
  deadline: string;
  priority: "High" | "Medium" | "Low";
  completed: boolean;
  meetingId: string;
}

interface Recommendation {
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  summary: string;
  keyPoints: string[];
  tasks: Task[];
  recommendations?: Recommendation[];
  audioUrl?: string;
  duration?: string;
}

// Translations
const translations = {
  vi: {
    title: "Trợ Lý Cuộc Họp AI",
    recordTab: "Ghi Âm",
    tasksTab: "Công Việc",
    systemTab: "Hệ Thống",
    startRecord: "Bắt đầu Ghi âm",
    stopRecord: "Dừng Ghi âm",
    processing: "AI đang phân tích và tổng hợp biên bản cuộc họp...",
    simulatedRecord: "Dùng bản thử nghiệm",
    noMeetings: "Chưa có cuộc họp nào được ghi nhận.",
    meetingList: "Lịch sử cuộc họp",
    meetingDetail: "Biên bản cuộc họp chi tiết",
    keyPoints: "Nội dung thảo luận chính",
    extractedTasks: "Kế hoạch hành động & Đầu việc được đề xuất",
    assignee: "Phụ trách",
    deadline: "Hạn chót",
    priority: "Độ ưu tiên",
    status: "Trạng thái",
    completed: "Đã xong",
    pending: "Đang làm",
    role: "Vai trò",
    admin: "Quản trị viên",
    member: "Thành viên",
    viewer: "Người xem",
    offlineMode: "Chế độ ngoại tuyến",
    online: "Trực tuyến",
    offline: "Ngoại tuyến",
    syncCloud: "Đồng bộ Đám mây",
    syncSuccess: "Đã đồng bộ đám mây thành công!",
    backupPeriod: "Sao lưu đám mây tự động",
    exportPdf: "Xuất PDF",
    exportCsv: "Xuất CSV",
    exportExcel: "Xuất Excel",
    shareEmail: "Gửi Email Báo Cáo",
    shareEmailSuccess: "Đã gửi email báo cáo thành công!",
    syncCalendar: "Đồng bộ Google Calendar",
    syncCalendarSuccess: "Đã thêm cuộc họp và các đầu việc vào Google Calendar!",
    confirmSyncCalendar: "Đồng bộ cuộc họp này và các đầu việc liên quan sang Google Calendar?",
    confirmShareEmail: "Gửi báo cáo tóm tắt cuộc họp và các đầu việc qua Email?",
    confirmDelete: "Bạn có chắc chắn muốn xóa cuộc họp này?",
    restrictViewer: "Tài khoản Người xem chỉ có quyền đọc. Không thể sửa đổi dữ liệu.",
    restrictMember: "Tài khoản Thành viên không thể truy cập bảng điều khiển bảo mật hệ thống.",
    backupDesc: "Sao lưu cục bộ / Restore dữ liệu bằng tệp JSON dễ dàng.",
    deadlineAlert: "Đầu việc sắp tới hạn trong 24h!",
    realtimeNotif: "Thông báo Hệ thống",
    systemLogs: "Nhật ký hệ thống",
    databaseSync: "Đồng bộ dữ liệu đa thiết bị",
    darkMode: "Chế độ tối",
    language: "Ngôn ngữ",
    googleLogin: "Đăng nhập Google",
    googleLogout: "Đăng xuất",
    welcome: "Xin chào",
    all: "Tất cả",
    inputTextPlaceholder: "Nhập hoặc dán nội dung thảo luận cuộc họp tại đây (ví dụ: Bản thảo, biên bản viết tay, transcript ghi âm)...",
    inputTextBtn: "Phân Tích & Tổng Hợp bằng Trí Tuệ Nhân Tạo AI",
    inputTextLabel: "Nhập trực tiếp văn bản thảo luận cuộc họp để AI phân tích:",
    aiRecommendations: "Đề xuất chiến lược tiếp theo từ AI (Recommendations)",
    meetingTasks: "Các đầu việc phát sinh từ cuộc họp này",
  },
  en: {
    title: "AI Meeting Assistant",
    recordTab: "Record",
    tasksTab: "Tasks",
    systemTab: "System",
    startRecord: "Start Recording",
    stopRecord: "Stop Recording",
    processing: "AI is analyzing and synthesizing meeting minutes...",
    simulatedRecord: "Use Mock Recording",
    noMeetings: "No meetings recorded yet.",
    meetingList: "Meeting History",
    meetingDetail: "Meeting Detail",
    keyPoints: "Key Discussion Points",
    extractedTasks: "Action Plan & Suggested Tasks",
    assignee: "Assignee",
    deadline: "Deadline",
    priority: "Priority",
    status: "Status",
    completed: "Completed",
    pending: "Pending",
    role: "Role",
    admin: "Admin",
    member: "Member",
    viewer: "Viewer",
    offlineMode: "Offline Mode",
    online: "Online",
    offline: "Offline",
    syncCloud: "Cloud Sync",
    syncSuccess: "Cloud synced successfully!",
    backupPeriod: "Automatic Cloud Backup",
    exportPdf: "Export PDF",
    exportCsv: "Export CSV",
    exportExcel: "Export Excel",
    shareEmail: "Send Email Report",
    shareEmailSuccess: "Email report sent successfully!",
    syncCalendar: "Sync to Google Calendar",
    syncCalendarSuccess: "Meeting and tasks added to Google Calendar!",
    confirmSyncCalendar: "Sync this meeting and related tasks to your Google Calendar?",
    confirmShareEmail: "Send the meeting summary and task list via Email?",
    confirmDelete: "Are you sure you want to delete this meeting?",
    restrictViewer: "Viewer account is read-only. Cannot modify data.",
    restrictMember: "Member account cannot access the system security dashboard.",
    backupDesc: "Local backup / Restore data using JSON file easily.",
    deadlineAlert: "Task deadline is within 24h!",
    realtimeNotif: "System Notifications",
    systemLogs: "System logs",
    databaseSync: "Multi-device data sync",
    darkMode: "Dark Mode",
    language: "Language",
    googleLogin: "Sign in with Google",
    googleLogout: "Sign Out",
    welcome: "Welcome",
    all: "All",
    inputTextPlaceholder: "Type or paste meeting notes/transcript here...",
    inputTextBtn: "Analyze & Synthesize with Artificial Intelligence",
    inputTextLabel: "Enter meeting notes manually for AI analysis:",
    aiRecommendations: "AI Suggested Next Steps & Tactical Recommendations",
    meetingTasks: "Tasks Assigned in This Meeting",
  }
};

export default function App() {
  // Localization & Theme
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const t = translations[lang];

  // App States
  const [activeTab, setActiveTab] = useState<"record" | "tasks" | "system">("record");
  const [userRole, setUserRole] = useState<"Admin" | "Member" | "Viewer">("Admin");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  
  // Realtime notification simulation
  const [notifications, setNotifications] = useState<string[]>([]);

  // Auth States
  const [user, setUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recordingWaves, setRecordingWaves] = useState<number[]>([]);
  const [inputText, setInputText] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const waveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // System Logs
  const [systemLogs, setSystemLogs] = useState<string[]>([
    "System initialized. Local database loaded.",
    "Role permissions configured successfully.",
  ]);

  // Load Initial Data from LocalStorage
  useEffect(() => {
    const savedMeetings = localStorage.getItem("ai_meetings");
    if (savedMeetings) {
      try {
        setMeetings(JSON.parse(savedMeetings));
      } catch (e) {
        console.error(e);
      }
    }

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    // Connection checks
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      logSystem("Internet connection restored. Background synchronization active.");
      triggerNotification("Đã kết nối Internet! Dữ liệu sẽ tự động đồng bộ đám mây.");
      // Auto Sync
      performAutoSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      logSystem("Disconnected from internet. Offline mode is active.");
      triggerNotification("Đang chạy ngoại tuyến. Dữ liệu của bạn vẫn an toàn trên thiết bị.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Init Auth
    initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setGoogleToken(token);
        logSystem(`Google user authorized: ${currentUser.email}`);
      },
      () => {
        setUser(null);
        setGoogleToken(null);
      }
    );

    // Initial check for deadlines
    checkDeadlines();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Save meetings to LocalStorage whenever modified
  useEffect(() => {
    if (meetings.length > 0) {
      localStorage.setItem("ai_meetings", JSON.stringify(meetings));
    }
  }, [meetings]);

  // Check and trigger deadline notifications
  const checkDeadlines = () => {
    const now = new Date();
    meetings.forEach(meeting => {
      meeting.tasks.forEach(task => {
        if (!task.completed && task.deadline && task.deadline !== "Chưa có") {
          const dlDate = new Date(task.deadline);
          const diffMs = dlDate.getTime() - now.getTime();
          const diffHrs = diffMs / (1000 * 60 * 60);
          if (diffHrs > 0 && diffHrs <= 24) {
            triggerNotification(`Công việc sắp tới hạn (24h): "${task.title}" do ${task.assignee} phụ trách.`);
          }
        }
      });
    });
  };

  const logSystem = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setSystemLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const triggerNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== msg));
    }, 6000);
  };

  // Switch dark/light mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      logSystem("Switched to dark mode.");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      logSystem("Switched to light mode.");
    }
  };

  // Login Google
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setGoogleToken(res.accessToken);
        logSystem(`Sign-in with Google success. Account: ${res.user.email}`);
        triggerNotification(`Đăng nhập thành công: ${res.user.displayName || res.user.email}`);
        // Fetch synced data from Cloud
        await fetchCloudBackup(res.user.email || "");
      }
    } catch (err: any) {
      console.error(err);
      logSystem(`Sign-in Google failed: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setGoogleToken(null);
      logSystem("Logged out of Google account.");
      triggerNotification("Đã đăng xuất tài khoản.");
    } catch (e: any) {
      console.error(e);
    }
  };

  // Simulated Voice Waveform Visualizer Generator
  const generateVoiceWaves = () => {
    const waves = [];
    for (let i = 0; i < 15; i++) {
      waves.push(Math.floor(Math.random() * 45) + 5);
    }
    setRecordingWaves(waves);
  };

  // Start Voice Recording
  const startRecording = async () => {
    if (userRole === "Viewer") {
      alert(t.restrictViewer);
      return;
    }

    try {
      setIsRecording(true);
      setRecordingDuration(0);
      audioChunksRef.current = [];

      // Try capturing real audio
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start();
        logSystem("Started capturing audio from microphone.");
      } else {
        logSystem("Microphone input not available in this environment. Falling back to simulated wave visuals.");
      }

      // Visual waveform simulation
      waveIntervalRef.current = setInterval(generateVoiceWaves, 200);

      // Timer update
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      triggerNotification("Đang ghi âm cuộc họp...");
    } catch (error: any) {
      console.error("Lỗi bắt đầu ghi âm:", error);
      logSystem(`Recording error: ${error.message}`);
      // Fallback to purely visual simulation if mic fails inside frame
      waveIntervalRef.current = setInterval(generateVoiceWaves, 200);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      triggerNotification("Bắt đầu ghi âm thử nghiệm (mô phỏng).");
    }
  };

  // Stop Recording
  const stopRecording = async () => {
    setIsRecording(false);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
    setRecordingWaves([]);

    logSystem(`Ghi âm hoàn tất. Thời lượng: ${recordingDuration} giây.`);

    // Process with Gemini AI
    setIsProcessing(true);
    triggerNotification("AI đang tổng hợp báo cáo và lập kế hoạch công việc...");

    // If real microphone was used, wait for MediaRecorder to stop completely and get final chunks
    const stopPromise = new Promise<void>((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        const timeout = setTimeout(() => {
          console.warn("MediaRecorder stop timed out, resolving anyway");
          resolve();
        }, 1200);

        mediaRecorderRef.current.onstop = () => {
          clearTimeout(timeout);
          resolve();
        };
        mediaRecorderRef.current.stop();
        // Stop all tracks on the stream
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      } else {
        resolve();
      }
    });

    await stopPromise;

    try {
      let responseData;

      if (audioChunksRef.current.length > 0) {
        logSystem(`Sending captured audio (${audioChunksRef.current.length} chunks) to Gemini AI.`);
        // Convert real audio to base64 and send to AI
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const base64Audio = await blobToBase64(audioBlob);

        const res = await fetch("/api/gemini/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: base64Audio,
            mimeType: "audio/webm"
          })
        });

        if (!res.ok) throw new Error("Lỗi phản hồi từ API Gemini");
        responseData = await res.json();
      } else {
        alert("Không thể thu nhận tín hiệu âm thanh hoặc bản ghi quá ngắn. Vui lòng thử ghi âm lại hoặc sử dụng tính năng tóm tắt bằng văn bản bên dưới.");
        setIsProcessing(false);
        return;
      }

      // Add to local state
      const meetingId = "m-" + Date.now();
      const newMeetingTasks: Task[] = (responseData.tasks || []).map((t: any, index: number) => ({
        id: `t-${meetingId}-${index}`,
        title: t.title,
        assignee: t.assignee || "Chưa phân công",
        deadline: t.deadline || "Chưa có",
        priority: t.priority || "Medium",
        completed: false,
        meetingId: meetingId
      }));

      const newMeeting: Meeting = {
        id: meetingId,
        title: responseData.title || `Cuộc họp ${new Date().toLocaleDateString()}`,
        date: new Date().toLocaleString("vi-VN"),
        summary: responseData.summary || "Không có tóm tắt.",
        keyPoints: responseData.keyPoints || [],
        tasks: newMeetingTasks,
        recommendations: responseData.recommendations || []
      };

      setMeetings(prev => [newMeeting, ...prev]);
      setSelectedMeetingId(meetingId);
      triggerNotification(`Đã phân tích thành công: ${newMeeting.title}`);
      logSystem(`AI summarized meeting successfully: ${newMeeting.title}`);

      // Auto backup if online
      if (isOnline && user?.email) {
        syncToCloud([newMeeting, ...meetings], getCombinedTasks([newMeeting, ...meetings]));
      }
    } catch (err: any) {
      console.error(err);
      logSystem(`AI processing failed: ${err.message}`);
      triggerNotification("Có lỗi xảy ra khi xử lý AI. Vui lòng thử lại!");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Text-based Summarization with real Gemini AI
  const handleTextSummarization = async () => {
    if (userRole === "Viewer") {
      alert(t.restrictViewer);
      return;
    }

    if (!inputText.trim()) {
      alert("Vui lòng nhập nội dung cuộc họp cần tóm tắt!");
      return;
    }

    setIsProcessing(true);
    triggerNotification("AI đang tổng hợp báo cáo và lập kế hoạch công việc từ văn bản...");
    logSystem("Sending meeting notes to Gemini AI for summarization.");

    try {
      const res = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText
        })
      });

      if (!res.ok) throw new Error("Lỗi phản hồi từ API Gemini");
      const responseData = await res.json();

      // Add to local state
      const meetingId = "m-" + Date.now();
      const newMeetingTasks: Task[] = (responseData.tasks || []).map((t: any, index: number) => ({
        id: `t-${meetingId}-${index}`,
        title: t.title,
        assignee: t.assignee || "Chưa phân công",
        deadline: t.deadline || "Chưa có",
        priority: t.priority || "Medium",
        completed: false,
        meetingId: meetingId
      }));

      const newMeeting: Meeting = {
        id: meetingId,
        title: responseData.title || `Cuộc họp ${new Date().toLocaleDateString()}`,
        date: new Date().toLocaleString("vi-VN"),
        summary: responseData.summary || "Không có tóm tắt.",
        keyPoints: responseData.keyPoints || [],
        tasks: newMeetingTasks,
        recommendations: responseData.recommendations || []
      };

      setMeetings(prev => [newMeeting, ...prev]);
      setSelectedMeetingId(meetingId);
      setInputText(""); // Clear input area
      triggerNotification(`Đã phân tích thành công: ${newMeeting.title}`);
      logSystem(`AI summarized meeting notes successfully: ${newMeeting.title}`);

      // Auto backup if online
      if (isOnline && user?.email) {
        syncToCloud([newMeeting, ...meetings], getCombinedTasks([newMeeting, ...meetings]));
      }
    } catch (err: any) {
      console.error(err);
      logSystem(`AI text processing failed: ${err.message}`);
      triggerNotification("Có lỗi xảy ra khi xử lý AI. Vui lòng thử lại!");
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert blob to base64 helper
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Get combined tasks from all meetings
  const getCombinedTasks = (allMeetings: Meeting[]): Task[] => {
    return allMeetings.flatMap(m => m.tasks);
  };

  // Toggle Task Completed Status
  const handleToggleTask = (taskId: string) => {
    if (userRole === "Viewer") {
      alert(t.restrictViewer);
      return;
    }

    const updatedMeetings = meetings.map(meeting => {
      const updatedTasks = meeting.tasks.map(task => {
        if (task.id === taskId) {
          const completed = !task.completed;
          logSystem(`Task updated: "${task.title}" status -> ${completed ? "Completed" : "Pending"}`);
          return { ...task, completed };
        }
        return task;
      });
      return { ...meeting, tasks: updatedTasks };
    });

    setMeetings(updatedMeetings);
    triggerNotification("Đã cập nhật trạng thái công việc!");

    // Sync if online
    if (isOnline && user?.email) {
      syncToCloud(updatedMeetings, getCombinedTasks(updatedMeetings));
    }
  };

  // Delete Meeting
  const handleDeleteMeeting = (meetingId: string) => {
    if (userRole === "Viewer") {
      alert(t.restrictViewer);
      return;
    }

    if (confirm(t.confirmDelete)) {
      const updatedMeetings = meetings.filter(m => m.id !== meetingId);
      setMeetings(updatedMeetings);
      if (selectedMeetingId === meetingId) {
        setSelectedMeetingId(null);
      }
      logSystem(`Deleted meeting with ID: ${meetingId}`);
      triggerNotification("Đã xóa cuộc họp thành công.");

      // Sync if online
      if (isOnline && user?.email) {
        syncToCloud(updatedMeetings, getCombinedTasks(updatedMeetings));
      }
    }
  };

  // Perform Google Calendar Sync
  const handleSyncToGoogleCalendar = async (meeting: Meeting) => {
    if (!googleToken) {
      alert("Vui lòng đăng nhập bằng Google trước khi đồng bộ lịch.");
      handleGoogleLogin();
      return;
    }

    if (!confirm(t.confirmSyncCalendar)) return;

    try {
      logSystem(`Starting Google Calendar synchronization for: ${meeting.title}`);
      
      // 1. Sync Meeting as event
      const eventStart = new Date().toISOString();
      const eventEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour later
      
      const calendarEvent = {
        summary: `[Cuộc họp AI] ${meeting.title}`,
        description: `Tóm tắt: ${meeting.summary}\n\nCác điểm thảo luận chính:\n${meeting.keyPoints.map(p => `- ${p}`).join('\n')}`,
        start: { dateTime: eventStart, timeZone: 'Asia/Ho_Chi_Minh' },
        end: { dateTime: eventEnd, timeZone: 'Asia/Ho_Chi_Minh' }
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendarEvent)
      });

      if (!res.ok) throw new Error('Không thể tạo sự kiện cuộc họp trên Google Calendar');

      // 2. Sync high-priority tasks as events
      for (const task of meeting.tasks) {
        if (task.deadline && task.deadline !== "Chưa có") {
          const taskEvent = {
            summary: `[AI Task Deadline] ${task.title} - ${task.assignee}`,
            description: `Công việc được đề xuất từ cuộc họp: ${meeting.title}\nĐộ ưu tiên: ${task.priority}`,
            start: { date: task.deadline },
            end: { date: task.deadline }
          };

          await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${googleToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskEvent)
          });
        }
      }

      logSystem(`Google Calendar synced successfully.`);
      triggerNotification(t.syncCalendarSuccess);
    } catch (error: any) {
      console.error(error);
      logSystem(`Google Calendar sync error: ${error.message}`);
      triggerNotification("Có lỗi xảy ra khi đồng bộ lịch.");
    }
  };

  // Send Meeting Report Email via Gmail API
  const handleShareViaEmail = async (meeting: Meeting) => {
    if (!googleToken) {
      alert("Vui lòng đăng nhập bằng Google trước khi gửi mail.");
      handleGoogleLogin();
      return;
    }

    const emailRecipient = prompt("Nhập email người nhận báo cáo cuộc họp:", user.email || "");
    if (!emailRecipient) return;

    if (!confirm(t.confirmShareEmail)) return;

    try {
      logSystem(`Preparing meeting report email for: ${emailRecipient}`);

      const emailSubject = `[Báo cáo Cuộc họp AI] ${meeting.title}`;
      
      const emailBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
              <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">${meeting.title}</h2>
              <p><strong>Thời gian ghi:</strong> ${meeting.date}</p>
              
              <h3 style="color: #1e1b4b; margin-top: 20px;">Tóm Tắt Cuộc Họp</h3>
              <p style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #cbd5e1; border-radius: 4px;">
                ${meeting.summary}
              </p>
              
              <h3 style="color: #1e1b4b; margin-top: 20px;">Điểm Thảo Luận Chính</h3>
              <ul>
                ${meeting.keyPoints.map(p => `<li style="margin-bottom: 8px;">${p}</li>`).join('')}
              </ul>
              
              <h3 style="color: #1e1b4b; margin-top: 20px;">Các Đầu Việc Cần Triển Khai</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background-color: #f1f5f9;">
                    <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Công Việc</th>
                    <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Phụ Trách</th>
                    <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Hạn Chót</th>
                    <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Ưu Tiên</th>
                  </tr>
                </thead>
                <tbody>
                  ${meeting.tasks.map(task => `
                    <tr>
                      <td style="border: 1px solid #cbd5e1; padding: 8px;">${task.title}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 8px;">${task.assignee}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 8px;">${task.deadline}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; color: ${task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981'}">${task.priority}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div style="margin-top: 30px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                Gửi tự động từ ứng dụng <strong>Meeting AI Recorder & Planner</strong>
              </div>
            </div>
          </body>
        </html>
      `;

      // RFC 2822 formatting
      const rawMessage = [
        `To: ${emailRecipient}`,
        `Subject: =?UTF-8?B?${Buffer.from(emailSubject).toString('base64')}?=`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        emailBody
      ].join('\r\n');

      // Base64url encode
      const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedMessage })
      });

      if (!res.ok) throw new Error('Không thể gửi mail qua Gmail API');

      logSystem(`Meeting report sent to: ${emailRecipient}`);
      triggerNotification(t.shareEmailSuccess);
    } catch (error: any) {
      console.error(error);
      logSystem(`Gmail send error: ${error.message}`);
      triggerNotification("Có lỗi xảy ra khi gửi email.");
    }
  };

  // Sync state to Cloud Backup Database
  const syncToCloud = async (allMeetings: Meeting[], allTasks: Task[]) => {
    if (!user?.email) return;

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          meetings: allMeetings,
          tasks: allTasks
        })
      });

      if (res.ok) {
        logSystem("Automatic cloud synchronization completed.");
      }
    } catch (e: any) {
      console.error(e);
      logSystem(`Auto cloud-sync failed: ${e.message}`);
    }
  };

  // Manual Trigger Force Sync
  const handleForceSync = async () => {
    if (!user?.email) {
      alert("Vui lòng đăng nhập để đồng bộ hóa dữ liệu tài khoản.");
      return;
    }

    logSystem("Forcing multi-device cloud backup sync...");
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          meetings: meetings,
          tasks: getCombinedTasks(meetings)
        })
      });

      if (res.ok) {
        const data = await res.json();
        logSystem(`Cloud sync success. Backup date: ${data.lastBackup}`);
        triggerNotification(t.syncSuccess);
      } else {
        throw new Error("Không thể lưu lên Cloud Server");
      }
    } catch (error: any) {
      console.error(error);
      logSystem(`Cloud Sync Failed: ${error.message}`);
      triggerNotification("Đồng bộ đám mây thất bại. Vui lòng thử lại!");
    }
  };

  // Fetch Synced cloud backup data
  const fetchCloudBackup = async (email: string) => {
    try {
      logSystem(`Fetching cloud data backup for: ${email}`);
      const res = await fetch(`/api/sync?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.meetings && data.meetings.length > 0) {
          setMeetings(data.meetings);
          logSystem(`Cloud data recovered successfully. Saved ${data.meetings.length} meetings.`);
          triggerNotification("Đã phục hồi dữ liệu từ tài khoản đám mây của bạn!");
        }
      }
    } catch (e: any) {
      console.error(e);
      logSystem("Failed to restore cloud backup.");
    }
  };

  const performAutoSync = () => {
    if (user?.email) {
      syncToCloud(meetings, getCombinedTasks(meetings));
    }
  };

  // Export report to CSV
  const exportToCsv = (meeting: Meeting) => {
    logSystem(`Exporting report to CSV: ${meeting.title}`);
    
    // Header
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Vietnamese compatibility
    csvContent += "BÁO CÁO CUỘC HỌP AI\n";
    csvContent += `Tiêu đề: ${meeting.title}\n`;
    csvContent += `Thời gian: ${meeting.date}\n\n`;
    
    csvContent += "NỘI DUNG TÓM TẮT\n";
    csvContent += `"${meeting.summary.replace(/"/g, '""')}"\n\n`;
    
    csvContent += "ĐIỂM THẢO LUẬN CHÍNH\n";
    meeting.keyPoints.forEach((pt, idx) => {
      csvContent += `${idx + 1}. "${pt.replace(/"/g, '""')}"\n`;
    });
    csvContent += "\n";
    
    csvContent += "DANH SÁCH ĐẦU VIỆC CẦN TRIỂN KHAI\n";
    csvContent += "Công việc,Người phụ trách,Hạn chót,Độ ưu tiên,Trạng thái\n";
    meeting.tasks.forEach(task => {
      csvContent += `"${task.title.replace(/"/g, '""')}","${task.assignee}","${task.deadline}","${task.priority}","${task.completed ? 'Đã xong' : 'Chưa xong'}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BaoCao_CuocHop_${meeting.title.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("Xuất file CSV thành công!");
  };

  // Export to Excel / Tab Separated format (highly compatible with MS Excel)
  const exportToExcel = (meeting: Meeting) => {
    logSystem(`Exporting report to Excel format: ${meeting.title}`);
    
    let excelContent = "\uFEFF"; // UTF-8 BOM
    excelContent += "BÁO CÁO TIẾN ĐỘ CUỘC HỌP\tĐỒNG BỘ AI\n\n";
    excelContent += `Cuộc họp:\t${meeting.title}\n`;
    excelContent += `Ngày tạo:\t${meeting.date}\n\n`;
    
    excelContent += "TÓM TẮT CUỘC HỌP\n";
    excelContent += `${meeting.summary}\n\n`;
    
    excelContent += "DANH SÁCH ĐẦU VIỆC\n";
    excelContent += "STT\tNội dung công việc\tNgười phụ trách\tHạn chót\tĐộ ưu tiên\tTrạng thái\n";
    
    meeting.tasks.forEach((task, idx) => {
      excelContent += `${idx + 1}\t${task.title}\t${task.assignee}\t${task.deadline}\t${task.priority}\t${task.completed ? 'Đã hoàn thành' : 'Đang xử lý'}\n`;
    });

    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BaoCao_CuocHop_${meeting.title.replace(/\s+/g, "_")}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("Xuất file Excel thành công!");
  };

  // Local JSON database backup download
  const handleDownloadBackupFile = () => {
    logSystem("Downloading full database backup file.");
    const backupData = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      meetings: meetings,
      userRole: userRole,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Database_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("Sao lưu dữ liệu xuống máy thành công!");
  };

  // Restore JSON database from local upload
  const handleUploadBackupFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (userRole === "Viewer") {
      alert(t.restrictViewer);
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.meetings && Array.isArray(data.meetings)) {
          setMeetings(data.meetings);
          logSystem("Database restored from local JSON file upload.");
          triggerNotification("Khôi phục toàn bộ cơ sở dữ liệu thành công!");
        } else {
          throw new Error("Định dạng tệp không hợp lệ");
        }
      } catch (err: any) {
        alert("Lỗi tải tệp: Đảm bảo chọn đúng tệp sao lưu JSON hợp lệ.");
        logSystem(`Restore error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Print friendly view (for PDF saving via browser)
  const handlePrintPdf = () => {
    logSystem("Triggered browser print window for PDF export.");
    window.print();
  };

  // Helper selectors
  const activeMeeting = meetings.find(m => m.id === selectedMeetingId) || meetings[0];
  const allTasksList = getCombinedTasks(meetings);

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-[#0A0A0C] text-zinc-100" : "bg-[#F8F8FA] text-zinc-900"} font-sans flex flex-col transition-colors duration-300 pb-20`}>
      
      {/* Realtime Notification Toast Stack */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100%-2rem)] pointer-events-none">
        {notifications.map((notif, index) => (
          <div 
            key={index} 
            className="p-3.5 bg-zinc-900/90 dark:bg-zinc-950/95 text-zinc-100 rounded-xl shadow-lg border border-zinc-800/80 text-xs backdrop-blur-md flex items-start gap-2.5 pointer-events-auto transition-all duration-300"
            id={`notif-${index}`}
          >
            <Activity className="h-3.5 w-3.5 shrink-0 mt-0.5 text-zinc-400" />
            <div>
              <p className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest leading-none font-semibold">{t.realtimeNotif}</p>
              <p className="mt-1 text-zinc-200 text-xs leading-normal font-normal">{notif}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header Bar */}
      <header className="sticky top-0 z-30 w-full border-b backdrop-blur-md bg-white/70 border-zinc-200/50 dark:bg-[#0A0A0C]/70 dark:border-zinc-900/40">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 rounded-lg shadow-xs">
              <Mic className="h-4 w-4 shrink-0" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <span>{t.title}</span>
              <span className="font-mono text-[8px] bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 px-1 py-0.5 rounded uppercase tracking-wider">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark Mode toggle */}
            <button 
              id="theme-toggle"
              onClick={toggleDarkMode} 
              className="p-2 rounded-lg bg-zinc-100/85 text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800/85 transition-colors touch-target flex items-center justify-center border border-zinc-200/20 dark:border-zinc-800/20"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Language toggle */}
            <button 
              id="lang-toggle"
              onClick={() => setLang(lang === "vi" ? "en" : "vi")} 
              className="p-2 px-2.5 rounded-lg bg-zinc-100/85 text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800/85 transition-colors touch-target flex items-center justify-center font-mono text-[9px] font-bold tracking-wider border border-zinc-200/20 dark:border-zinc-800/20"
            >
              <Globe className="h-3.5 w-3.5 mr-1" />
              {lang === "vi" ? "EN" : "VI"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Space */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 py-5 pb-24 overflow-y-auto">
        
        {/* User Account State Banner */}
        <div className="mb-6 p-4 bg-white dark:bg-[#121215] border border-zinc-200/40 dark:border-zinc-900/40 rounded-xl flex items-center justify-between shadow-xs">
          {user ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 flex items-center justify-center font-semibold text-xs shrink-0 border border-zinc-200/20 dark:border-zinc-800/30">
                {user.displayName ? user.displayName[0] : (user.email ? user.email[0].toUpperCase() : "U")}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 leading-none font-bold">{t.welcome}</p>
                <p className="text-xs font-semibold truncate leading-normal text-zinc-800 dark:text-zinc-200 mt-1">{user.displayName || user.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Đồng bộ đám mây và Lịch Google</span>
            </div>
          )}

          {user ? (
            <button 
              id="google-logout-btn"
              onClick={handleLogout} 
              className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-zinc-200/60 hover:bg-zinc-50 text-zinc-600 dark:border-zinc-850 dark:hover:bg-zinc-900 dark:text-zinc-300 flex items-center gap-1.5 transition-colors touch-target"
            >
              <LogOut className="h-3 w-3" />
              {t.googleLogout}
            </button>
          ) : (
            <button 
              id="google-login-btn"
              onClick={handleGoogleLogin} 
              disabled={isLoggingIn}
              className="text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 text-white rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer touch-target"
            >
              <LogIn className="h-3 w-3" />
              {isLoggingIn ? "..." : t.googleLogin}
            </button>
          )}
        </div>

        {/* Tab Record (Main Audio recording and meeting list) */}
        {activeTab === "record" && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Microphone/Recorder Widget */}
            <div className="p-6 bg-white dark:bg-[#121215] rounded-xl border border-zinc-200/40 dark:border-zinc-900/40 shadow-xs text-center relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400 text-[8px] font-mono uppercase tracking-widest font-bold rounded border border-zinc-200/30 dark:border-zinc-800/30">
                  REALTIME ENGINE
                </span>
              </div>

              <div className="my-3 flex flex-col items-center justify-center">
                {isRecording ? (
                  <div className="flex items-end justify-center gap-[3px] mb-4 h-12 w-full px-8">
                    {recordingWaves.map((waveHeight, idx) => (
                      <span 
                        key={idx} 
                        className="w-[3px] bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-150" 
                        style={{ height: `${waveHeight * 0.8}px` }}
                      ></span>
                    ))}
                    {recordingWaves.length === 0 && <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest animate-pulse">Analyzing...</span>}
                  </div>
                ) : (
                  <div className="h-12 flex items-center justify-center mb-4">
                    <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">TAP DIAL TO START SESSION</p>
                  </div>
                )}

                {/* Elegant concentric dials */}
                <div className="flex justify-center items-center gap-6 mt-1 relative">
                  <div className="absolute inset-0 -m-3 border border-zinc-100 dark:border-zinc-900/50 rounded-full animate-[spin_20s_linear_infinite] pointer-events-none"></div>
                  <div className="absolute inset-0 -m-1 border border-zinc-200/30 dark:border-zinc-800/30 rounded-full pointer-events-none"></div>

                  {!isRecording ? (
                    <button 
                      id="start-recording-btn"
                      onClick={startRecording}
                      disabled={isProcessing}
                      className="h-20 w-20 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-full flex items-center justify-center shadow-md hover:scale-[1.03] active:scale-95 transition-all cursor-pointer touch-target disabled:opacity-50 border border-zinc-800 dark:border-zinc-200"
                    >
                      <Mic className="h-8 w-8" />
                    </button>
                  ) : (
                    <button 
                      id="stop-recording-btn"
                      onClick={stopRecording}
                      className="h-20 w-20 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-[1.03] active:scale-95 transition-all cursor-pointer touch-target border border-red-500 relative"
                    >
                      <span className="absolute inset-0 rounded-full bg-red-600/30 animate-ping"></span>
                      <MicOff className="h-8 w-8 z-10" />
                    </button>
                  )}
                </div>

                {isRecording && (
                  <p className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest mt-5 flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-950/20 px-3 py-1 rounded-full border border-red-200/30 dark:border-red-900/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    REC: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
                  </p>
                )}

                {isProcessing && (
                  <div className="mt-5 p-3.5 w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200/30 dark:border-zinc-800/30 flex items-center gap-2.5 justify-center">
                    <RefreshCw className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 animate-spin" />
                    <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">{t.processing}</span>
                  </div>
                )}
              </div>

              {/* Manual text notes/transcript entry */}
              {!isRecording && !isProcessing && (
                <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-900/40 text-left">
                  <p className="font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 mb-2.5 flex items-center gap-1.5 uppercase tracking-widest">
                    <FileText className="h-3.5 w-3.5 text-zinc-400" />
                    {t.inputTextLabel}
                  </p>
                  <textarea
                    id="manual-notes-input"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t.inputTextPlaceholder}
                    disabled={isProcessing}
                    rows={4}
                    className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200/40 dark:bg-zinc-900/30 dark:border-[#1c1c21] dark:border-zinc-800/50 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 resize-none transition-all"
                  />
                  <button
                    id="submit-manual-notes-btn"
                    onClick={handleTextSummarization}
                    disabled={isProcessing || !inputText.trim()}
                    className="w-full mt-2.5 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer touch-target"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {t.inputTextBtn}
                  </button>
                </div>
              )}

            </div>

            {/* Selected Meeting Report Viewer */}
            {activeMeeting ? (
              <div className="bg-white dark:bg-[#121215] border border-zinc-200/40 dark:border-zinc-900/40 rounded-xl p-5 shadow-xs space-y-5 animate-fade-in">
                
                <div className="flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-900/40 pb-3">
                  <div>
                    <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{activeMeeting.date}</span>
                    <h2 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50 mt-1 leading-snug">{activeMeeting.title}</h2>
                  </div>
                  
                  <button 
                    id="delete-meeting-btn"
                    onClick={() => handleDeleteMeeting(activeMeeting.id)} 
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/10 rounded-lg transition-all touch-target shrink-0"
                    title="Xóa cuộc họp"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Summary block */}
                <div className="space-y-1.5">
                  <h3 className="font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Tóm Tắt Báo Cáo</h3>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50/50 dark:bg-zinc-900/20 p-3.5 rounded-lg border border-zinc-200/40 dark:border-zinc-800/40 leading-relaxed font-normal">
                    {activeMeeting.summary}
                  </p>
                </div>

                {/* Keypoints list */}
                <div className="space-y-2">
                  <h3 className="font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t.keyPoints}</h3>
                  <ul className="space-y-2.5">
                    {activeMeeting.keyPoints.map((point, index) => (
                      <li key={index} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5 leading-relaxed">
                        <span className="h-1 w-1 rounded-full bg-zinc-400 dark:bg-zinc-600 shrink-0 mt-2"></span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Meeting Tasks checklist */}
                {activeMeeting.tasks && activeMeeting.tasks.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-900/40">
                    <h3 className="font-mono text-[9px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" />
                      {t.meetingTasks}
                    </h3>
                    <div className="space-y-2">
                      {activeMeeting.tasks.map(task => (
                        <div 
                          key={task.id}
                          className="p-3 bg-zinc-50/40 border border-zinc-200/20 dark:bg-zinc-900/10 dark:border-zinc-900/40 rounded-xl flex items-start gap-3 hover:border-zinc-200 dark:hover:border-zinc-800 transition-all"
                        >
                          <button 
                            id={`meeting-detail-task-${task.id}`}
                            onClick={() => handleToggleTask(task.id)} 
                            className="p-0.5 rounded-full text-zinc-300 hover:text-zinc-900 dark:text-zinc-700 dark:hover:text-zinc-100 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-zinc-800 dark:text-zinc-100" />
                            ) : (
                              <Circle className="h-4 w-4 text-zinc-300 dark:text-zinc-700" />
                            )}
                          </button>
                          <div className="flex-1 text-left min-w-0">
                            <p className={`text-xs font-semibold leading-relaxed text-zinc-800 dark:text-zinc-200 ${task.completed ? "line-through text-zinc-400 dark:text-zinc-500" : ""}`}>
                              {task.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">
                              <span>Phụ trách: <strong className="text-zinc-600 dark:text-zinc-300">{task.assignee}</strong></span>
                              {task.deadline && task.deadline !== "Chưa có" && (
                                <span>Hạn: <strong>{task.deadline}</strong></span>
                              )}
                              <span className={`px-1 rounded-[3px] text-[7px] font-mono font-bold tracking-wider border ${task.priority === 'High' ? 'bg-red-50 text-red-600 border-red-200/30 dark:bg-red-950/10 dark:text-red-400 dark:border-red-900/30' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200/30 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200/30 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/30'}`}>
                                {task.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Suggested Next Steps & Tactical Recommendations */}
                {activeMeeting.recommendations && activeMeeting.recommendations.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-900/40">
                    <h3 className="font-mono text-[9px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                      {t.aiRecommendations}
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {activeMeeting.recommendations.map((rec, index) => (
                        <div 
                          key={index} 
                          className="p-3.5 bg-zinc-50/70 border border-zinc-200/40 dark:bg-zinc-900/30 dark:border-zinc-800/40 rounded-xl space-y-1.5 hover:border-zinc-300 dark:hover:border-zinc-700/50 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-snug">{rec.title}</h4>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider border ${rec.priority === 'High' ? 'bg-red-50 text-red-600 border-red-200/30 dark:bg-red-950/10 dark:text-red-400 dark:border-red-900/30' : rec.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200/30 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200/30 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/30'}`}>
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed pl-6">{rec.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Integration Actions */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900/40 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      id="sync-calendar-btn"
                      onClick={() => handleSyncToGoogleCalendar(activeMeeting)} 
                      className="text-[11px] font-semibold py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-target shadow-xs"
                    >
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {t.syncCalendar}
                    </button>
                    <button 
                      id="share-email-btn"
                      onClick={() => handleShareViaEmail(activeMeeting)} 
                      className="text-[11px] font-semibold py-2.5 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-target shadow-xs"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {t.shareEmail}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      id="export-pdf-btn"
                      onClick={handlePrintPdf} 
                      className="text-[10px] font-mono font-bold uppercase tracking-wider py-1.5 bg-zinc-50 hover:bg-zinc-100/60 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 rounded-lg border border-zinc-200/30 dark:border-zinc-800/30 flex items-center justify-center gap-1.5 transition-all touch-target cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-zinc-400" />
                      PDF
                    </button>
                    <button 
                      id="export-csv-btn"
                      onClick={() => exportToCsv(activeMeeting)} 
                      className="text-[10px] font-mono font-bold uppercase tracking-wider py-1.5 bg-zinc-50 hover:bg-zinc-100/60 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 rounded-lg border border-zinc-200/30 dark:border-zinc-800/30 flex items-center justify-center gap-1.5 transition-all touch-target cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-zinc-400" />
                      CSV
                    </button>
                    <button 
                      id="export-excel-btn"
                      onClick={() => exportToExcel(activeMeeting)} 
                      className="text-[10px] font-mono font-bold uppercase tracking-wider py-1.5 bg-zinc-50 hover:bg-zinc-100/60 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 rounded-lg border border-zinc-200/30 dark:border-zinc-800/30 flex items-center justify-center gap-1.5 transition-all touch-target cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-zinc-400" />
                      Excel
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-8 bg-white dark:bg-[#121215] border border-zinc-200/40 dark:border-zinc-900/40 text-center rounded-xl">
                <Mic className="h-6 w-6 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-wider">{t.noMeetings}</p>
              </div>
            )}

            {/* List of past meetings */}
            {meetings.length > 1 && (
              <div className="space-y-2.5">
                <h3 className="font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t.meetingList}</h3>
                <div className="space-y-2">
                  {meetings.map(m => (
                    <button 
                      id={`select-meeting-${m.id}`}
                      key={m.id}
                      onClick={() => setSelectedMeetingId(m.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between touch-target ${selectedMeetingId === m.id ? "bg-zinc-100/40 border-zinc-300 dark:bg-zinc-900/40 dark:border-zinc-800 shadow-xs" : "bg-white border-zinc-200/40 dark:bg-[#121215] dark:border-zinc-900/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20"}`}
                    >
                      <div className="overflow-hidden pr-3 flex items-center gap-3">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${selectedMeetingId === m.id ? "bg-zinc-800 dark:bg-zinc-100" : "bg-transparent"}`}></span>
                        <div className="min-w-0">
                          <p className="font-mono text-[8px] font-semibold text-zinc-400 uppercase leading-none">{m.date}</p>
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate mt-1">{m.title}</p>
                        </div>
                      </div>
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-colors ${selectedMeetingId === m.id ? "text-zinc-800 dark:text-zinc-100" : ""}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab Tasks Planner */}
        {activeTab === "tasks" && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Headline and statistics summary (Bento card) */}
            <div className="p-4 bg-white dark:bg-[#121215] border border-zinc-200/40 dark:border-zinc-900/40 rounded-xl flex items-center justify-between">
              <div className="flex-1">
                <p className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest">TIẾN ĐỘ THỰC HIỆN</p>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mt-1">
                  {allTasksList.filter(t => t.completed).length} / {allTasksList.length} Công việc hoàn thành
                </p>
                <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-3 max-w-[200px]">
                  <div 
                    className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-500"
                    style={{ width: `${allTasksList.length > 0 ? (allTasksList.filter(t => t.completed).length / allTasksList.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div className="h-12 w-12 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 border border-zinc-200/20 dark:border-zinc-800/30 shadow-2xs">
                {allTasksList.length > 0 ? Math.round((allTasksList.filter(t => t.completed).length / allTasksList.length) * 100) : 0}%
              </div>
            </div>

            {/* Actions / Tasks Checklist */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">DANH SÁCH ĐẦU VIỆC</h3>
                {allTasksList.filter(t => !t.completed).length > 0 && (
                  <span className="text-[10px] bg-red-50 dark:bg-red-950/20 text-red-500 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/30 font-medium">{t.deadlineAlert}</span>
                )}
              </div>

              {allTasksList.length > 0 ? (
                <div className="space-y-2">
                  {allTasksList.map(task => (
                    <div 
                      key={task.id}
                      className="p-3.5 bg-white dark:bg-[#121215] border border-zinc-200/40 dark:border-zinc-900/40 rounded-xl flex items-start gap-3.5 hover:border-zinc-300 dark:hover:border-zinc-850 transition-all"
                      id={`task-item-${task.id}`}
                    >
                      <button 
                        id={`toggle-task-${task.id}`}
                        onClick={() => handleToggleTask(task.id)} 
                        className="p-0.5 rounded-full text-zinc-300 hover:text-zinc-900 dark:text-zinc-700 dark:hover:text-zinc-100 transition-colors shrink-0 touch-target flex items-center justify-center cursor-pointer"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-zinc-800 dark:text-zinc-100" />
                        ) : (
                          <Circle className="h-4.5 w-4.5 text-zinc-300 dark:text-zinc-700" />
                        )}
                      </button>

                      <div className="flex-1 text-left min-w-0">
                        <p className={`text-xs font-semibold leading-relaxed text-zinc-800 dark:text-zinc-200 ${task.completed ? "line-through text-zinc-400 dark:text-zinc-500" : ""}`}>
                          {task.title}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                          <span className="flex items-center gap-0.5">
                            <span className="text-zinc-400">Phụ trách:</span>
                            <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{task.assignee}</span>
                          </span>
                          
                          {task.deadline && task.deadline !== "Chưa có" && (
                            <span className="flex items-center gap-1 font-mono text-[9px] text-zinc-500">
                              <Calendar className="h-3 w-3 text-zinc-400" />
                              <span>{task.deadline}</span>
                            </span>
                          )}

                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider border ${task.priority === 'High' ? 'bg-red-50 text-red-600 border-red-200/30 dark:bg-red-950/10 dark:text-red-400 dark:border-red-900/30' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200/30 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200/30 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/30'}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white dark:bg-[#121215] border border-zinc-200/40 dark:border-zinc-900/40 rounded-xl shadow-2xs">
                  <Check className="h-5 w-5 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">NO ACTIVE ACTIONS</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab System Controls & Backup */}
        {activeTab === "system" && (
          <div className="space-y-5 animate-fade-in">
            
            {/* Security access level simulator */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/40 dark:border-zinc-900/40 rounded-xl p-4.5 space-y-4">
              <h3 className="font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-zinc-400" />
                Hệ thống bảo mật & phân quyền
              </h3>
              
              <div className="space-y-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Thiết lập vai trò tài khoản hiện tại để giả lập kiểm tra bảo mật truy cập dữ liệu và sao lưu:
                </p>
                
                <div className="grid grid-cols-3 gap-1.5">
                  <button 
                    id="role-admin-btn"
                    onClick={() => {
                      setUserRole("Admin");
                      logSystem("System role changed to Admin.");
                      triggerNotification("Quyền tài khoản: Quản trị viên.");
                    }} 
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider py-2 rounded-lg border transition-all duration-150 touch-target ${userRole === "Admin" ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 shadow-xs" : "bg-zinc-50 border-zinc-200/60 dark:bg-zinc-900/30 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
                  >
                    Admin
                  </button>
                  <button 
                    id="role-member-btn"
                    onClick={() => {
                      setUserRole("Member");
                      logSystem("System role changed to Member.");
                      triggerNotification("Quyền tài khoản: Thành viên.");
                    }} 
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider py-2 rounded-lg border transition-all duration-150 touch-target ${userRole === "Member" ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 shadow-xs" : "bg-zinc-50 border-zinc-200/60 dark:bg-zinc-900/30 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
                  >
                    Member
                  </button>
                  <button 
                    id="role-viewer-btn"
                    onClick={() => {
                      setUserRole("Viewer");
                      logSystem("System role changed to Viewer (Read Only).");
                      triggerNotification("Quyền tài khoản: Người xem.");
                    }} 
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider py-2 rounded-lg border transition-all duration-150 touch-target ${userRole === "Viewer" ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 shadow-xs" : "bg-zinc-50 border-zinc-200/60 dark:bg-zinc-900/30 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
                  >
                    Viewer
                  </button>
                </div>
              </div>
            </div>

            {/* Database Cloud backup status */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/40 dark:border-zinc-900/40 rounded-xl p-4.5 space-y-4">
              <h3 className="font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-zinc-400" />
                {t.databaseSync}
              </h3>
              
              <div className="space-y-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Lưu trữ đám mây định kỳ cho phép đồng bộ tiến độ công việc đa thiết bị nhanh chóng và bảo mật.
                </p>

                <button 
                  id="force-sync-btn"
                  onClick={handleForceSync}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-lg font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 touch-target cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t.syncCloud}
                </button>
              </div>
            </div>

            {/* Offline Local backup / Upload JSON */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/40 dark:border-zinc-900/40 rounded-xl p-4.5 space-y-4">
              <h3 className="font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Download className="h-4 w-4 text-zinc-400" />
                Sao lưu & Khôi phục Ngoại tuyến
              </h3>
              
              <div className="space-y-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {t.backupDesc}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    id="download-backup-btn"
                    onClick={handleDownloadBackupFile}
                    className="py-2 bg-zinc-50 hover:bg-zinc-100/60 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 rounded-lg font-semibold text-xs border border-zinc-200/40 dark:border-zinc-800/30 flex items-center justify-center gap-1.5 transition-all touch-target cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Tải Sao lưu
                  </button>

                  <label className="py-2 bg-zinc-50 hover:bg-zinc-100/60 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 rounded-lg font-semibold text-xs border border-zinc-200/40 dark:border-zinc-800/30 flex items-center justify-center gap-1.5 cursor-pointer text-center transition-all touch-target">
                    <Upload className="h-3.5 w-3.5" />
                    Nạp Sao lưu
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleUploadBackupFile} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* System logs view */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/40 dark:border-zinc-900/40 rounded-xl p-4.5 space-y-3">
              <h3 className="font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-zinc-400" />
                {t.systemLogs}
              </h3>
              <div className="bg-zinc-950 text-zinc-400 text-[9px] p-3 rounded-lg font-mono border border-zinc-900 space-y-1.5 max-h-36 overflow-y-auto leading-relaxed scrollbar-thin">
                {systemLogs.map((log, idx) => (
                  <p key={idx} className="truncate">{log}</p>
                ))}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer Navigation Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#0A0A0C]/95 backdrop-blur-md border-t border-zinc-200/40 dark:border-zinc-900/40 shadow-sm">
        <div className="max-w-md mx-auto h-14 px-6 flex items-center justify-around">
          
          <button 
            id="tab-record"
            onClick={() => {
              setActiveTab("record");
              logSystem("Switched to Recording Tab.");
            }} 
            className={`flex flex-col items-center justify-center flex-1 h-full touch-target transition-all ${activeTab === "record" ? "text-zinc-900 dark:text-zinc-100 font-semibold scale-102" : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"}`}
          >
            <Mic className="h-4.5 w-4.5 shrink-0" />
            <span className="font-mono text-[8px] font-bold mt-1 uppercase tracking-widest">{t.recordTab}</span>
          </button>

          <button 
            id="tab-tasks"
            onClick={() => {
              setActiveTab("tasks");
              logSystem("Switched to Tasks Tab.");
            }} 
            className={`flex flex-col items-center justify-center flex-1 h-full touch-target transition-all ${activeTab === "tasks" ? "text-zinc-900 dark:text-zinc-100 font-semibold scale-102" : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"}`}
          >
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
            <span className="font-mono text-[8px] font-bold mt-1 uppercase tracking-widest">{t.tasksTab}</span>
          </button>

          <button 
            id="tab-system"
            onClick={() => {
              setActiveTab("system");
              logSystem("Switched to System Configuration Tab.");
            }} 
            className={`flex flex-col items-center justify-center flex-1 h-full touch-target transition-all ${activeTab === "system" ? "text-zinc-900 dark:text-zinc-100 font-semibold scale-102" : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"}`}
          >
            <Settings className="h-4.5 w-4.5 shrink-0" />
            <span className="font-mono text-[8px] font-bold mt-1 uppercase tracking-widest">{t.systemTab}</span>
          </button>

        </div>
      </footer>

    </div>
  );
}
