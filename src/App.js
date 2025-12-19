import React, { useState, useEffect } from "react";
// Added getApps and getApp to prevent duplicate initialization
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import {
  Activity,
  LogOut,
  Plus,
  User,
  Stethoscope,
  Clock,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Lock,
  Briefcase,
  LayoutDashboard,
  Trash2,
  X,
  Check,
  Filter,
  History,
  Blocks,
} from "lucide-react";

// --- PRODUCTION CONFIGURATION ---
// 1. Go to console.firebase.google.com
// 2. Create a project > Register Web App
// 3. Copy the config object and paste it below:
const firebaseConfig = {
  apiKey: "AIzaSyDjeSaGBeZgG_J1opQF0PbH1FbkrXjPx3Q",
  authDomain: "absence-reporting-tool.firebaseapp.com",
  projectId: "absence-reporting-tool",
  storageBucket: "absence-reporting-tool.firebasestorage.app",
  messagingSenderId: "657196164586",
  appId: "1:657196164586:web:ea0d245bdbe6917ef37e93",
};

// Initialize Firebase (Safe Mode)
// Checks if Firebase is already initialized to prevent "Duplicate App" errors
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- APP CONSTANTS ---
// This is the hardcoded email that triggers the first Admin setup
const ADMIN_EMAIL = "arnold.sim@lego.com";

const TEAMS = [
  "Bricktastic",
  "Rebrick",
  "Brickstars",
  "Piece Makers",
  "Brick Force",
  "Leg Godt Angels",
  "L2ST",
  "Others",
];

// --- COMPONENTS ---

// 1. Login Component
const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Ensure anonymous connection for DB access
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const emailLower = email.toLowerCase().trim();

      // --- Admin Auto-Provisioning Logic ---
      if (emailLower === ADMIN_EMAIL.toLowerCase()) {
        const q = query(
          collection(db, "staff_list"),
          where("email", "==", emailLower)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          // First time Admin setup
          if (password === "Welcome1") {
            const newAdmin = {
              name: "Arnold Sim",
              email: emailLower,
              password: password,
              role: "admin",
              team: "Others",
              createdAt: serverTimestamp(),
            };
            await addDoc(collection(db, "staff_list"), newAdmin);
            onLogin({ ...newAdmin, id: "temp-admin-id" });
            return;
          } else {
            setError("Admin account not found. Use default credentials.");
            setLoading(false);
            return;
          }
        }
      }

      // --- Standard Staff Login ---
      const q = query(
        collection(db, "staff_list"),
        where("email", "==", emailLower),
        where("password", "==", password)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        onLogin({ ...userData, id: snapshot.docs[0].id });
      } else {
        setError("Invalid email or password.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      // Friendly error message handling
      if (err.code === "auth/api-key-not-valid.-please-pass-a-valid-api-key.") {
        setError("Configuration Error: Invalid Firebase API Key.");
      } else {
        setError(`Login failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border-t-4 border-red-600 relative overflow-hidden">
        {/* LEGO Strip */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-yellow-400 via-green-600 to-blue-600"></div>

        <div className="flex justify-center mb-6 mt-4">
          <div className="p-3 bg-red-100 rounded-full">
            <Blocks className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          Absence Reporting Tool
        </h2>
        <p className="text-center text-slate-500 mb-6 font-medium text-sm uppercase tracking-wide">
          CSE Singapore
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition font-medium disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
};

// 2. Absence Form
const AbsenceForm = ({ user }) => {
  const [leaveType, setLeaveType] = useState("Sick Leave");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await addDoc(collection(db, "absences"), {
        userEmail: user.email,
        userName: user.name || user.email,
        userTeam: user.team || "Others",
        type: leaveType,
        date: date,
        reason: reason,
        timestamp: serverTimestamp(),
        status: "Pending Review",
      });

      setSuccess(true);
      setReason("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error reporting absence:", error);
      alert(
        "Failed to save report. Check your internet connection or database permissions."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start">
        <Stethoscope className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-yellow-900">Registration Portal</h3>
          <p className="text-sm text-yellow-800 mt-1">
            Absences reported here are immediately visible to your Team Leader.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2 text-red-600" />
          Report New Absence
        </h3>

        {success && (
          <div className="mb-4 bg-green-50 text-green-700 p-3 rounded flex items-center animate-pulse">
            <CheckCircle className="w-5 h-5 mr-2" />
            Absence registered successfully.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Leave Type
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="Sick Leave">Sick Leave</option>
                <option value="Childcare Leave">Childcare Leave</option>
                <option value="Compassionate Leave">Compassionate Leave</option>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason / Notes
            </label>
            <textarea
              required
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly explain..."
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 outline-none"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition flex items-center justify-center font-medium shadow-sm"
          >
            {submitting ? "Registering..." : "Register Absence"}
          </button>
        </form>
      </div>
    </div>
  );
};

// 3. Team Dashboard
const TeamDashboard = () => {
  const [absences, setAbsences] = useState([]);
  const [dateFilter, setDateFilter] = useState("today"); // 'today' or 'all'
  const [teamFilter, setTeamFilter] = useState("All");

  useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA");

    // PRODUCTION: Root collection 'absences'
    const q = query(collection(db, "absences"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // 1. Date Filter
      if (dateFilter === "today") {
        data = data.filter((item) => item.date === today);
      }

      // 2. Team Filter
      if (teamFilter !== "All") {
        data = data.filter((item) => item.userTeam === teamFilter);
      }

      // Sort
      data.sort((a, b) => new Date(b.date) - new Date(a.date));

      setAbsences(data);
    });

    return () => unsubscribe();
  }, [dateFilter, teamFilter]);

  const handleAcknowledge = async (id) => {
    try {
      await setDoc(
        doc(db, "absences", id),
        {
          status: "Acknowledged",
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
          <LayoutDashboard className="w-6 h-6 mr-2 text-red-600" />
          Team Overview
        </h2>

        <div className="flex flex-wrap gap-3">
          {/* Team Selector */}
          <div className="relative">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-300 text-slate-700 py-1.5 pl-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-red-500 text-sm font-medium"
            >
              <option value="All">All Teams</option>
              {TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
              <Filter className="w-3 h-3" />
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex bg-white rounded-lg shadow-sm border p-1">
            <button
              onClick={() => setDateFilter("today")}
              className={`px-4 py-1.5 text-sm font-medium rounded ${
                dateFilter === "today"
                  ? "bg-red-100 text-red-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter("all")}
              className={`px-4 py-1.5 text-sm font-medium rounded ${
                dateFilter === "all"
                  ? "bg-red-100 text-red-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              All History
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <p className="text-sm text-slate-500 mb-1">
            {teamFilter === "All" ? "Total" : teamFilter} Absent{" "}
            {dateFilter === "today" ? "Today" : "Total"}
          </p>
          <p className="text-3xl font-bold text-slate-800">{absences.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800">
            {dateFilter === "today" ? "Today's Absences" : "Absence History"}
          </h3>
        </div>
        {absences.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {dateFilter === "today"
              ? "No absences found for current filter."
              : "No records found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {absences.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {item.userName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                        {item.userTeam || "Others"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.type === "Sick Leave"
                            ? "bg-red-100 text-red-700"
                            : item.type === "Childcare Leave"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {item.reason}
                    </td>
                    <td className="px-4 py-3">
                      {item.status === "Pending Review" || !item.status ? (
                        <button
                          onClick={() => handleAcknowledge(item.id)}
                          className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 transition flex items-center"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Acknowledge
                        </button>
                      ) : (
                        <span className="text-xs text-green-600 font-medium flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {item.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// 4. Manage Users
const ManageUsers = () => {
  const [users, setUsers] = useState([]);

  // Create Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [newTeam, setNewTeam] = useState(TEAMS[0]);
  const [createStatus, setCreateStatus] = useState("");

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    // PRODUCTION: Root collection 'staff_list'
    const q = query(collection(db, "staff_list"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateStatus("Creating...");
    try {
      await addDoc(collection(db, "staff_list"), {
        name: newName,
        email: newEmail.toLowerCase().trim(),
        password: newPassword,
        role: newRole,
        team: newTeam,
        createdAt: serverTimestamp(),
      });
      setCreateStatus("User added successfully.");
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setTimeout(() => setCreateStatus(""), 3000);
    } catch (err) {
      setCreateStatus("Error: " + err.message);
    }
  };

  const executeDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "staff_list", id));
      setDeleteId(null);
    } catch (err) {
      console.error("Delete failed", err);
      setCreateStatus("Error deleting user: " + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Create User Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-slate-600" />
            Add New User
          </h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full p-2 border rounded mt-1 bg-slate-50"
              >
                <option value="staff">Staff</option>
                <option value="leader">Team Leader</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Team
              </label>
              <select
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                className="w-full p-2 border rounded mt-1 bg-slate-50"
              >
                {TEAMS.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder="Full Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <button className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 font-medium">
              Create User
            </button>
          </form>
          {createStatus && (
            <p className="mt-2 text-sm text-green-600">{createStatus}</p>
          )}
        </div>
      </div>

      {/* User List */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Existing Users</h3>
            <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600">
              {users.length} Users
            </span>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {u.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${
                          u.role === "admin"
                            ? "bg-red-100 text-red-700"
                            : u.role === "leader"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.team || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3 text-right">
                      {u.email !== ADMIN_EMAIL.toLowerCase() &&
                        (deleteId === u.id ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => executeDelete(u.id)}
                              className="text-xs bg-red-600 text-white px-3 py-1.5 rounded font-medium hover:bg-red-700 transition"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteId(null)}
                              className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(u.id)}
                            className="text-red-400 hover:text-red-600 p-1 transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. My History List
const MyHistory = ({ user }) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "absences"),
      where("userEmail", "==", user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setHistory(data);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-800 flex items-center">
          <History className="w-4 h-4 mr-2 text-slate-500" />
          My Absence History
        </h3>
        <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600">
          {history.length} Records
        </span>
      </div>

      <div className="overflow-x-auto">
        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No records found.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                    {item.date}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.type === "Sick Leave"
                          ? "bg-red-100 text-red-700"
                          : item.type === "Childcare Leave"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 truncate max-w-xs">
                    {item.reason}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium flex items-center ${
                        item.status === "Acknowledged"
                          ? "text-green-600"
                          : "text-slate-400"
                      }`}
                    >
                      {item.status === "Acknowledged" && (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      )}
                      {item.status || "Pending Review"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// --- Main Application Component ---
export default function App() {
  const [appUser, setAppUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("register");

  // 1. Initialize Firebase Connection
  useEffect(() => {
    // Basic auth check listener
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Firebase Connection Error:", e);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    setAppUser(null);
    setView("register");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Connecting...
      </div>
    );
  if (!appUser)
    return (
      <Login
        onLogin={(user) => {
          setAppUser(user);
          // If leader or admin, default to their dashboard view for better daily workflow
          if (user.role === "admin" || user.role === "leader") {
            setView("team_dashboard");
          } else {
            setView("register");
          }
        }}
      />
    );

  const isAdmin = appUser.role === "admin";
  const isLeader = appUser.role === "admin" || appUser.role === "leader";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b-4 border-transparent relative shadow-sm">
        {/* LEGO Strip Top Border */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-yellow-400 via-green-600 to-blue-600"></div>

        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center mt-1">
          <div className="flex items-center space-x-2">
            <div className="bg-red-600 p-1.5 rounded-sm">
              <Blocks className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Absence Reporting Tool
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-right">
              <div className="flex items-center justify-end space-x-1.5">
                {isAdmin && <ShieldCheck className="w-3 h-3 text-red-600" />}
                {appUser.role === "leader" && (
                  <Briefcase className="w-3 h-3 text-blue-600" />
                )}
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">
                  {appUser.role === "admin"
                    ? "Super Admin"
                    : appUser.role === "leader"
                    ? "Team Leader"
                    : "Staff Member"}
                </p>
              </div>
              <p className="text-sm font-bold text-slate-800">
                {appUser.name || appUser.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex space-x-6 overflow-x-auto">
          {/* 1. My Absence (Register) */}
          <button
            onClick={() => setView("register")}
            className={`py-4 text-sm font-bold border-b-4 transition whitespace-nowrap ${
              view === "register"
                ? "border-red-600 text-red-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            My Absence
          </button>

          {/* 2. Absence History (New Tab) */}
          <button
            onClick={() => setView("my_history")}
            className={`py-4 text-sm font-bold border-b-4 transition whitespace-nowrap ${
              view === "my_history"
                ? "border-red-600 text-red-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Absence History
          </button>

          {/* 3. Team Dashboard (Leaders/Admins) */}
          {isLeader && (
            <button
              onClick={() => setView("team_dashboard")}
              className={`py-4 text-sm font-bold border-b-4 transition whitespace-nowrap ${
                view === "team_dashboard"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Team Dashboard
            </button>
          )}

          {/* 4. Manage Users (Admins) */}
          {isAdmin && (
            <button
              onClick={() => setView("users")}
              className={`py-4 text-sm font-bold border-b-4 transition whitespace-nowrap ${
                view === "users"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Manage Users
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {view === "register" && <AbsenceForm user={appUser} />}

        {view === "my_history" && <MyHistory user={appUser} />}

        {view === "team_dashboard" && isLeader && <TeamDashboard />}

        {view === "users" && isAdmin && <ManageUsers />}
      </main>
    </div>
  );
}
