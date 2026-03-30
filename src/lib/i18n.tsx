"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "he";
export type Dir = "ltr" | "rtl";

const dict = {
  // ── Navigation ──
  "nav.dashboard": { en: "Dashboard", he: "לוח בקרה" },
  "nav.tasks": { en: "Tasks", he: "משימות" },
  "nav.costs": { en: "Costs", he: "עלויות" },
  "nav.history": { en: "History", he: "היסטוריה" },
  "nav.vendors": { en: "Vendors", he: "ספקים" },
  "nav.property": { en: "Property", he: "נכס" },
  "nav.team": { en: "Team", he: "צוות" },
  "nav.issues": { en: "Issues", he: "תקלות" },
  "nav.projects": { en: "Projects", he: "פרויקטים" },
  "nav.signOut": { en: "Sign Out", he: "התנתק" },
  "nav.admin": { en: "Admin", he: "ניהול" },

  // ── Admin ──
  "admin.totalUsers": { en: "Total Users", he: "סה״כ משתמשים" },
  "admin.totalProjects": { en: "Total Projects", he: "סה״כ פרויקטים" },
  "admin.totalNodes": { en: "Total Nodes", he: "סה״כ צמתים" },
  "admin.allUsers": { en: "All Users", he: "כל המשתמשים" },
  "admin.allProjects": { en: "All Projects", he: "כל הפרויקטים" },
  "admin.allTeams": { en: "All Teams", he: "כל הצוותים" },
  "admin.systemOverview": { en: "System overview", he: "סקירת מערכת" },
  "admin.projects": { en: "projects", he: "פרויקטים" },
  "admin.members": { en: "members", he: "חברים" },
  "admin.nodes": { en: "nodes", he: "צמתים" },

  // ── Login ──
  "login.title": { en: "Reno Tracker", he: "מעקב שיפוצים" },
  "login.subtitle": {
    en: "Manage your renovation with clarity",
    he: "נהל את השיפוץ שלך בבהירות",
  },
  "login.signIn": { en: "Sign in with Google", he: "התחבר עם Google" },
  "login.tagline": {
    en: "Your dream home, managed beautifully",
    he: "בית החלומות שלך, מנוהל בצורה מושלמת",
  },

  // ── Projects ──
  "proj.title": { en: "My Projects", he: "הפרויקטים שלי" },
  "proj.create": { en: "New Project", he: "פרויקט חדש" },
  "proj.name": { en: "Project name", he: "שם הפרויקט" },
  "proj.budget": { en: "Budget", he: "תקציב" },
  "proj.active": { en: "Active", he: "פעיל" },
  "proj.switch": { en: "Switch", he: "עבור" },
  "proj.noProjects": { en: "No projects yet. Create your first one.", he: "אין פרויקטים עדיין. צור את הראשון." },
  "proj.startDate": { en: "Start date", he: "תאריך התחלה" },
  "proj.endDate": { en: "End date", he: "תאריך סיום" },

  // ── Dashboard ──
  "dash.welcome": { en: "Welcome back", he: "שמחים שחזרת" },
  "dash.budget": { en: "Total Budget", he: "תקציב כולל" },
  "dash.spent": { en: "Total Spent", he: "סה״כ הוצאות" },
  "dash.remaining": { en: "Remaining", he: "נותר" },
  "dash.groups": { en: "Groups", he: "קבוצות" },
  "dash.tasks": { en: "Tasks", he: "משימות" },
  "dash.openIssues": { en: "Open Issues", he: "תקלות פתוחות" },
  "dash.snagAlerts": { en: "Snag Alerts", he: "התראות תקלות" },
  "dash.noIssues": { en: "No open issues", he: "אין תקלות פתוחות" },
  "dash.financialOverview": { en: "Financial Overview", he: "סקירה פיננסית" },
  "dash.projectSummary": { en: "Project Summary", he: "סיכום פרויקט" },

  // ── Tasks ──
  "task.title": { en: "Project Tasks", he: "משימות הפרויקט" },
  "task.addTask": { en: "Add Task", he: "הוסף משימה" },
  "task.name": { en: "Task name", he: "שם המשימה" },
  "task.vendor": { en: "Vendor", he: "ספק" },
  "task.expected": { en: "Expected Cost", he: "עלות צפויה" },
  "task.actual": { en: "Actual Cost", he: "עלות בפועל" },
  "task.status": { en: "Status", he: "סטטוס" },
  "task.noTasks": { en: "No tasks yet", he: "אין משימות עדיין" },
  "task.save": { en: "Save", he: "שמור" },
  "task.cancel": { en: "Cancel", he: "ביטול" },
  "task.selectParent": { en: "Parent task (optional)", he: "משימת אב (אופציונלי)" },
  "task.selectVendor": { en: "Vendor (optional)", he: "ספק (אופציונלי)" },
  "task.selectType": { en: "Category (optional)", he: "קטגוריה (אופציונלי)" },
  "task.allTasks": { en: "All Tasks", he: "כל המשימות" },
  "task.expectedDate": { en: "Expected Date", he: "תאריך צפוי" },
  "task.milestones": { en: "Payments", he: "תשלומים" },
  "task.receipts": { en: "Receipts", he: "קבלות" },
  "task.notes": { en: "Notes", he: "הערות" },
  "task.deleteConfirm": { en: "Delete \"{name}\" and all sub-tasks?", he: "למחוק את \"{name}\" וכל תתי-המשימות?" },
  "task.selectTask": { en: "Select task", he: "בחר משימה" },
  "task.left": { en: "left", he: "נותר" },
  "task.moveToRoot": { en: "Drop here for root level", he: "שחרר כאן לרמת השורש" },
  "task.markDone": { en: "Mark as Done", he: "סמן כהושלם" },
  "task.markedDone": { en: "Marked as done", he: "סומן כהושלם" },
  "general.undo": { en: "Undo", he: "בטל" },
  "general.redo": { en: "Redo", he: "חזור" },
  "general.nothingToUndo": { en: "Nothing to undo", he: "אין מה לבטל" },
  "general.nothingToRedo": { en: "Nothing to redo", he: "אין מה לחזור" },
  "general.undoHint": { en: "Undo (Ctrl+Z)", he: "בטל (Ctrl+Z)" },
  "general.redoHint": { en: "Redo (Ctrl+Y)", he: "חזור (Ctrl+Y)" },
  "general.undoHintMac": { en: "Undo (\u2318Z)", he: "בטל (\u2318Z)" },
  "general.redoHintMac": { en: "Redo (\u2318\u21e7Z)", he: "חזור (\u2318\u21e7Z)" },

  // ── Team ──
  "team.title": { en: "Team Members", he: "חברי הצוות" },
  "team.invite": { en: "Invite Member", he: "הזמן חבר" },
  "team.email": { en: "Email address", he: "כתובת אימייל" },
  "team.role": { en: "Role", he: "תפקיד" },
  "team.send": { en: "Send Invite", he: "שלח הזמנה" },
  "team.remove": { en: "Remove", he: "הסר" },
  "team.removeConfirm": { en: "Remove {name}?", he: "להסיר את {name}?" },
  "team.owner": { en: "Owner", he: "בעלים" },
  "team.admin": { en: "Admin", he: "מנהל" },
  "team.editor": { en: "Editor", he: "עורך" },
  "team.viewer": { en: "Viewer", he: "צופה" },
  "team.you": { en: "You", he: "את/ה" },
  "team.invited": {
    en: "Invited {email}",
    he: "הוזמן {email}",
  },
  "team.inviteHint": {
    en: "Invite anyone by email. They'll get access when they sign in with Google.",
    he: "הזמן לפי אימייל. הגישה תינתן אוטומטית בהתחברות עם Google.",
  },
  "team.pendingSignup": {
    en: "Pending — hasn't signed in yet",
    he: "ממתין — עדיין לא התחבר",
  },
  "team.copyLink": {
    en: "Copy sign-in link",
    he: "העתק קישור התחברות",
  },

  // ── Issues ──
  "issues.title": { en: "Issues & Snags", he: "תקלות ובעיות" },
  "issues.addIssue": { en: "Add Issue", he: "הוסף תקלה" },
  "issues.issueTitle": { en: "Issue title", he: "כותרת התקלה" },
  "issues.description": { en: "Description", he: "תיאור" },
  "issues.resolved": { en: "Resolved", he: "נפתר" },
  "issues.open": { en: "Open", he: "פתוח" },
  "issues.inProgress": { en: "In Progress", he: "בטיפול" },

  // ── Statuses ──
  "status.NOT_STARTED": { en: "Not Started", he: "טרם התחיל" },
  "status.IN_PROGRESS": { en: "In Progress", he: "בתהליך" },
  "status.COMPLETED": { en: "Completed", he: "הושלם" },
  "status.ON_HOLD": { en: "On Hold", he: "בהמתנה" },
  "status.PENDING": { en: "Pending", he: "ממתין" },
  "status.ORDERED": { en: "Ordered", he: "הוזמן" },
  "status.DELIVERED": { en: "Delivered", he: "סופק" },
  "status.INSTALLED": { en: "Installed", he: "הותקן" },
  "status.CANCELLED": { en: "Cancelled", he: "בוטל" },
  "status.OPEN": { en: "Open", he: "פתוח" },
  "status.RESOLVED": { en: "Resolved", he: "נפתר" },
  "status.DUE": { en: "Due", he: "לתשלום" },
  "status.PAID": { en: "Paid", he: "שולם" },
  "status.OVERDUE": { en: "Overdue", he: "באיחור" },

  // ── Sub-Project Types ──
  "type.PLUMBING": { en: "Plumbing", he: "אינסטלציה" },
  "type.ELECTRICAL": { en: "Electrical", he: "חשמל" },
  "type.CARPENTRY": { en: "Carpentry", he: "נגרות" },
  "type.PAINTING": { en: "Painting", he: "צביעה" },
  "type.FLOORING": { en: "Flooring", he: "ריצוף" },
  "type.SMART_HOME": { en: "Smart Home", he: "בית חכם" },
  "type.AUDIO_VISUAL": { en: "Audio/Visual", he: "שמע/וידאו" },
  "type.HVAC": { en: "HVAC", he: "מיזוג אוויר" },
  "type.WINDOWS_DOORS": { en: "Windows & Doors", he: "חלונות ודלתות" },
  "type.KITCHEN": { en: "Kitchen", he: "מטבח" },
  "type.BATHROOM": { en: "Bathroom", he: "חדר אמבטיה" },
  "type.GENERAL": { en: "General", he: "כללי" },

  // ── Task categories ──
  "task.rooms": { en: "Rooms", he: "חדרים" },
  "task.search": { en: "Search tasks...", he: "חפש משימות..." },
  "task.sortBy": { en: "Sort by", he: "מיין לפי" },
  "task.sortDefault": { en: "Default", he: "ברירת מחדל" },
  "task.sortPrice": { en: "Price", he: "מחיר" },
  "task.sortCategory": { en: "Category", he: "קטגוריה" },
  "task.sortVendor": { en: "Vendor", he: "ספק" },
  "task.sortStatus": { en: "Status", he: "סטטוס" },
  "task.sortPayment": { en: "Payment %", he: "% תשלום" },
  "task.viewList": { en: "List", he: "רשימה" },
  "task.viewCards": { en: "Cards", he: "כרטיסים" },
  "task.budgetRemaining": { en: "Budget Left", he: "יתרת תקציב" },
  "task.noCost": { en: "No cost set", he: "לא הוגדרה עלות" },
  "task.ofBudget": { en: "of budget", he: "מתוך התקציב" },
  "task.subTasks": { en: "sub-tasks", he: "תת-משימות" },
  "task.noMatch": { en: "No tasks found", he: "לא נמצאו משימות" },
  "task.addRoom": { en: "Add a room...", he: "הוסף חדר..." },
  "task.allRooms": { en: "All rooms assigned", he: "כל החדרים שויכו" },
  "costs.unscheduled": { en: "Unscheduled", he: "לא מתוכנן" },
  "costs.unpaidOnly": { en: "Unpaid only", he: "לא שולם בלבד" },
  "costs.allPayments": { en: "All payments", he: "כל התשלומים" },
  "costs.unpaidBreakdown": { en: "Unpaid Payments", he: "תשלומים שלא שולמו" },
  "costs.noUnpaid": { en: "All payments are up to date", he: "כל התשלומים מעודכנים" },
  "costs.pendingPayments": { en: "Pending Payments", he: "תשלומים ממתינים" },
  "costs.unscheduledTasks": { en: "No Payments Set", he: "ללא תשלומים" },
  "costs.gapPayments": { en: "Partially Scheduled", he: "מתוכנן חלקית" },
  "costs.remaining": { en: "remaining", he: "נותר" },
  "export.pdf": { en: "PDF Report", he: "דוח PDF" },
  "export.png": { en: "Screenshot", he: "צילום מסך" },
  "export.pngCopied": { en: "Image copied!", he: "תמונה הועתקה!" },
  "task.markPaid": { en: "Mark as Paid", he: "סמן כשולם" },
  "task.markedPaid": { en: "Marked as paid", he: "סומן כשולם" },
  "prop.selectFloor": { en: "Select floor", he: "בחר קומה" },
  "export.title": { en: "Export & Share", he: "ייצוא ושיתוף" },
  "export.sheets": { en: "Google Sheets", he: "Google Sheets" },
  "export.sheetsDesc": { en: "Download CSV for Google Sheets", he: "הורד CSV ל-Google Sheets" },
  "export.docs": { en: "Full Report", he: "דוח מלא" },
  "export.docsDesc": { en: "Download styled HTML report", he: "הורד דוח מעוצב" },
  "export.whatsapp": { en: "WhatsApp", he: "WhatsApp" },
  "export.whatsappDesc": { en: "Share summary via WhatsApp", he: "שתף סיכום ב-WhatsApp" },
  "export.copied": { en: "Copied to clipboard!", he: "הועתק!" },

  // ── Categories ──
  "cat.title": { en: "Categories", he: "קטגוריות" },
  "cat.addCategory": { en: "Add Category", he: "הוסף קטגוריה" },
  "cat.name": { en: "Category name", he: "שם הקטגוריה" },
  "cat.noCategories": { en: "No categories yet", he: "אין קטגוריות עדיין" },
  "cat.deleteConfirm": { en: "Delete category \"{name}\"?", he: "למחוק את הקטגוריה \"{name}\"?" },
  "cat.selectCategory": { en: "Category (optional)", he: "קטגוריה (אופציונלי)" },
  "cat.createNew": { en: "Create new", he: "צור חדש" },

  // ── Vendors ──
  "vendor.title": { en: "Vendors", he: "ספקים" },
  "vendor.addVendor": { en: "Add Vendor", he: "הוסף ספק" },
  "vendor.name": { en: "Vendor name", he: "שם הספק" },
  "vendor.category": { en: "Category", he: "קטגוריה" },
  "vendor.phone": { en: "Phone", he: "טלפון" },
  "vendor.email": { en: "Email", he: "אימייל" },
  "vendor.noVendors": { en: "No vendors yet", he: "אין ספקים עדיין" },
  "vendor.deleteConfirm": { en: "Delete vendor \"{name}\"?", he: "למחוק את הספק \"{name}\"?" },

  // ── Property (Floors & Rooms) ──
  "prop.title": { en: "Property", he: "נכס" },
  "prop.floors": { en: "Floors", he: "קומות" },
  "prop.addFloor": { en: "Add Floor", he: "הוסף קומה" },
  "prop.floorName": { en: "Floor name", he: "שם הקומה" },
  "prop.addRoom": { en: "Add Room", he: "הוסף חדר" },
  "prop.roomName": { en: "Room name", he: "שם החדר" },
  "prop.roomType": { en: "Room type", he: "סוג חדר" },
  "prop.noFloors": { en: "No floors yet", he: "אין קומות עדיין" },
  "prop.deleteRoomConfirm": { en: "Delete room \"{name}\"?", he: "למחוק את החדר \"{name}\"?" },
  "prop.deleteFloorConfirm": { en: "Delete floor \"{name}\" and all rooms?", he: "למחוק קומה \"{name}\" וחדריה?" },
  "roomType.ROOM": { en: "Room", he: "חדר" },
  "roomType.BALCONY": { en: "Balcony", he: "מרפסת" },
  "roomType.STORAGE": { en: "Storage", he: "מחסן" },
  "roomType.OTHER": { en: "Other", he: "אחר" },

  // ── Costs page ──
  "costs.title": { en: "Cost Insights", he: "תובנות עלויות" },
  "costs.totalCost": { en: "Total Cost", he: "עלות כוללת" },
  "costs.totalPaid": { en: "Total Paid", he: "סה״כ שולם" },
  "costs.totalRemaining": { en: "Left to Pay", he: "נותר לשלם" },
  "costs.byTask": { en: "By Task Group", he: "לפי קבוצת משימות" },
  "costs.upcomingPayments": { en: "Upcoming", he: "תשלומים קרובים" },
  "costs.paymentCalendar": { en: "Payment Calendar", he: "לוח תשלומים" },
  "costs.noUpcoming": { en: "No upcoming payments", he: "אין תשלומים קרובים" },
  "costs.overdue": { en: "Overdue", he: "באיחור" },
  "costs.paidOf": { en: "paid of", he: "שולם מתוך" },
  "costs.markPaid": { en: "Mark as Paid", he: "סמן כשולם" },
  "costs.inputAmount": { en: "Amount (ILS)", he: "סכום (₪)" },
  "costs.inputPercentage": { en: "or Percentage (%)", he: "או אחוז (%)" },
  "costs.sun": { en: "Sun", he: "א׳" },
  "costs.mon": { en: "Mon", he: "ב׳" },
  "costs.tue": { en: "Tue", he: "ג׳" },
  "costs.wed": { en: "Wed", he: "ד׳" },
  "costs.thu": { en: "Thu", he: "ה׳" },
  "costs.fri": { en: "Fri", he: "ו׳" },
  "costs.sat": { en: "Sat", he: "ש׳" },

  // ── Version History ──
  "hist.title": { en: "Version History", he: "היסטוריית גרסאות" },
  "hist.checkpoint": { en: "Save Checkpoint", he: "שמור נקודת ביקורת" },
  "hist.label": { en: "Version label", he: "שם הגרסה" },
  "hist.labelPlaceholder": { en: 'e.g. "Before kitchen changes"', he: 'למשל "לפני שינויים במטבח"' },
  "hist.rollback": { en: "Rollback", he: "שחזור" },
  "hist.rollbackConfirm": { en: "Rollback to \"{label}\"? Current state will be auto-saved first.", he: "לשחזר ל\"{label}\"? המצב הנוכחי יישמר אוטומטית." },
  "hist.noVersions": { en: "No checkpoints yet. Save your first version.", he: "אין נקודות ביקורת. שמור גרסה ראשונה." },
  "hist.autoSave": { en: "Auto-save", he: "שמירה אוטומטית" },
  "hist.current": { en: "Current", he: "נוכחי" },
  "hist.savedBy": { en: "Saved by", he: "נשמר על ידי" },
  "hist.restoredTo": { en: "Restored to", he: "שוחזר ל" },

  // ── CRUD general ──
  "crud.edit": { en: "Edit", he: "ערוך" },
  "crud.delete": { en: "Delete", he: "מחק" },
  "crud.deleteConfirm": { en: "Delete \"{name}\"?", he: "למחוק את \"{name}\"?" },
  "crud.saving": { en: "Saving...", he: "שומר..." },

  // ── Item detail ──
  "item.addMilestone": { en: "Add Payment", he: "הוסף תשלום" },
  "item.milestoneLabel": { en: "Payment label", he: "שם התשלום" },
  "item.amount": { en: "Amount", he: "סכום" },
  "item.dueDate": { en: "Due date", he: "תאריך יעד" },
  "item.addNote": { en: "Add Note", he: "הוסף הערה" },
  "item.notePlaceholder": { en: "Write a note...", he: "כתוב הערה..." },
  "item.uploadReceipt": { en: "Upload Receipt", he: "העלה קבלה" },

  // ── Integrations ──
  "nav.integrations": { en: "Integrations", he: "אינטגרציות" },
  "nav.settings": { en: "Settings", he: "הגדרות" },
  "integ.title": { en: "AI Assistant", he: "עוזר AI" },
  "integ.subtitle": { en: "Let AI help manage your renovation project", he: "תן ל-AI לעזור בניהול השיפוץ" },
  "integ.setup": { en: "Set Up", he: "הגדר" },
  "integ.connected": { en: "Connected", he: "מחובר" },
  "integ.neverUsed": { en: "Never used", he: "לא נעשה שימוש" },
  "integ.lastUsed": { en: "Last used", he: "שימוש אחרון" },
  "integ.connections": { en: "Your Connections", he: "החיבורים שלך" },
  "integ.noConnections": { en: "No connections yet. Set up an assistant above.", he: "אין חיבורים. הגדר עוזר למעלה." },
  "integ.revoke": { en: "Revoke", he: "בטל" },
  "integ.revokeConfirm": { en: "Revoke this connection?", he: "לבטל חיבור זה?" },
  "integ.advanced": { en: "Advanced", he: "מתקדם" },
  "integ.createKey": { en: "Create API Key", he: "צור מפתח API" },
  "integ.keyName": { en: "Key Name", he: "שם המפתח" },
  "integ.scope": { en: "Permissions", he: "הרשאות" },
  "integ.scopeReadOnly": { en: "Read Only", he: "קריאה בלבד" },
  "integ.scopeReadWrite": { en: "Read & Write", he: "קריאה וכתיבה" },
  "integ.scopeAdmin": { en: "Full Access", he: "גישה מלאה" },
  "integ.openApiUrl": { en: "OpenAPI Spec URL", he: "כתובת OpenAPI" },
  "integ.mcpUrl": { en: "MCP Server URL", he: "כתובת שרת MCP" },
  "integ.copyKey": { en: "Copy Key", he: "העתק מפתח" },
  "integ.copyUrl": { en: "Copy URL", he: "העתק כתובת" },
  "integ.keyWarning": { en: "Copy this key now — you won't see it again!", he: "העתק עכשיו — לא יוצג שוב!" },
  "integ.setupStep": { en: "Step", he: "שלב" },
  "integ.copied": { en: "Copied!", he: "הועתק!" },
  "integ.tryIt": { en: "Try saying:", he: "נסה להגיד:" },
  "integ.trySample": { en: "Show me my renovation projects", he: "הראה לי את פרויקטי השיפוץ שלי" },

  // ── General ──
  "general.toggleLanguage": { en: "Toggle language", he: "החלף שפה" },
  "general.loading": { en: "Loading...", he: "טוען..." },
  "general.error": { en: "Something went wrong", he: "משהו השתבש" },
  "general.noProject": { en: "No project found", he: "לא נמצא פרויקט" },
  "general.currency": { en: "ILS", he: "₪" },
  "general.more": { en: "more \u2192", he: "\u05E2\u05D5\u05D3 \u2192" },

  // ── Settings ──
  "settings.title": { en: "Settings", he: "הגדרות" },
  "settings.themeDesc": { en: "Choose a color theme", he: "בחר ערכת צבעים" },

  // ── V2 Nav sections ──
  "nav.sectionMain": { en: "MAIN", he: "ראשי" },
  "nav.sectionDirectory": { en: "DIRECTORY", he: "מדריך" },
  "nav.sectionTrack": { en: "TRACK", he: "מעקב" },
  "nav.sectionManage": { en: "MANAGE", he: "ניהול" },
  "nav.home": { en: "Home", he: "בית" },
  "nav.more": { en: "More", he: "עוד" },
  "nav.directory": { en: "Directory", he: "מדריך" },
  "nav.add": { en: "Add", he: "הוסף" },

  // ── Compact toolbar ──
  "task.filter": { en: "Filter", he: "סינון" },

  // ── Milestone sections ──
  "milestone.overdue": { en: "Overdue", he: "באיחור" },
  "milestone.pending": { en: "Pending", he: "ממתין" },
  "milestone.paid": { en: "Paid", he: "שולם" },
  "milestone.overdueWas": { en: "Overdue — was due", he: "באיחור — תאריך יעד היה" },
  "milestone.showPaid": { en: "Show paid", he: "הצג ששולמו" },
  "milestone.hidePaid": { en: "Hide paid", he: "הסתר ששולמו" },

  // ── Home tabs ──
  "home.overview": { en: "Overview", he: "סקירה" },
  "home.payments": { en: "Payments", he: "תשלומים" },
  "home.issues": { en: "Issues", he: "תקלות" },

  // ── Share sheet ──
  "share.title": { en: "Share", he: "שתף" },
  "share.screenshot": { en: "Screenshot", he: "צילום מסך" },
  "share.screenshotDesc": { en: "Copy or download as PNG", he: "העתק או הורד כ-PNG" },
} as const;

export type TKey = keyof typeof dict;

interface I18nContextValue {
  lang: Lang;
  dir: Dir;
  setLang: (lang: Lang) => void;
  t: (key: TKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("reno-lang", l);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("reno-lang") as Lang | null;
    if (stored === "en" || stored === "he") setLangState(stored);
  }, []);

  const dir: Dir = lang === "he" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const t = useCallback(
    (key: TKey) => dict[key]?.[lang] ?? key,
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, dir, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
