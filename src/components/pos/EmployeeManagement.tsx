import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Employee, AttendanceRecord, ActivityLog } from '../../types';
import { 
  Users, Key, ShieldCheck, Clock, FileText, CheckCircle, Plus, 
  Trash2, Search, X, ShieldAlert, RefreshCw, LogIn, LogOut 
} from 'lucide-react';

interface EmployeeManagementProps {
  onRefreshData: () => void;
  triggerGlobalAlert: (type: 'success' | 'error', text: string) => void;
}

export default function EmployeeManagement({
  onRefreshData,
  triggerGlobalAlert
}: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Cashier' | 'Manager' | 'Admin'>('Cashier');
  const [pinCode, setPinCode] = useState('');

  // Attendance Quick pin login
  const [pinInput, setPinInput] = useState('');
  const [authMsg, setAuthMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      // Employees
      const empSnap = await getDocs(collection(db, 'employees'));
      const empList: Employee[] = [];
      empSnap.forEach(doc => {
        empList.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(empList);

      // Attendance
      const attSnap = await getDocs(collection(db, 'attendance'));
      const attList: AttendanceRecord[] = [];
      attSnap.forEach(doc => {
        attList.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
      });
      attList.sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
      setAttendance(attList);

      // Activity logs
      const logSnap = await getDocs(collection(db, 'activity_logs'));
      const logList: ActivityLog[] = [];
      logSnap.forEach(doc => {
        logList.push({ id: doc.id, ...doc.data() } as ActivityLog);
      });
      logList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(logList.slice(0, 50)); // limit to 50 logs for readability

    } catch (e: any) {
      console.error(e);
      triggerGlobalAlert('error', 'Failed to fetch employee dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !pinCode.trim()) {
      triggerGlobalAlert('error', 'All fields are mandatory!');
      return;
    }
    if (pinCode.length < 4 || isNaN(Number(pinCode))) {
      triggerGlobalAlert('error', 'PIN Code must be at least 4 digits numeric.');
      return;
    }

    const payloadId = `emp_${Date.now()}`;
    const payload: Employee = {
      id: payloadId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role: role,
      pinCode: pinCode.trim(),
      status: 'Active',
      createdDate: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'employees', payloadId), payload);
      triggerGlobalAlert('success', `Employee "${payload.name}" onboarded as ${payload.role}!`);
      setName('');
      setEmail('');
      setPhone('');
      setRole('Cashier');
      setPinCode('');
      setShowForm(false);
      fetchStaffData();
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerGlobalAlert('error', 'Onboarding failed: ' + err.message);
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to terminate/delete employee "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'employees', id));
      triggerGlobalAlert('success', `Deleted employee profile "${name}"`);
      fetchStaffData();
      onRefreshData();
    } catch (e: any) {
      console.error(e);
    }
  };

  // Clock-in / clock-out quick log using PIN
  const handleQuickClock = async (action: 'IN' | 'OUT') => {
    if (pinInput.length < 4) {
      setAuthMsg({ type: 'error', text: 'Please enter a 4-digit PIN.' });
      return;
    }

    const emp = employees.find(e => e.pinCode === pinInput);
    if (!emp) {
      setAuthMsg({ type: 'error', text: 'Invalid employee credential PIN.' });
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const attId = `${emp.id}_${today}`;

      if (action === 'IN') {
        const attRecord: AttendanceRecord = {
          id: attId,
          employeeId: emp.id,
          employeeName: emp.name,
          role: emp.role,
          date: today,
          clockIn: new Date().toISOString(),
          status: 'Present'
        };
        await setDoc(doc(db, 'attendance', attId), attRecord);

        // Activity log
        const logId = `log_${Date.now()}`;
        await setDoc(doc(db, 'activity_logs', logId), {
          id: logId,
          employeeId: emp.id,
          employeeName: emp.name,
          action: 'Attendance Clock-In',
          details: `Employee clocked-in for shop duty successfully at ${new Date().toLocaleTimeString('en-IN')}`,
          timestamp: new Date().toISOString()
        });

        setAuthMsg({ type: 'success', text: `Clock-In Recorded! Welcome, ${emp.name}.` });
      } else {
        const docRef = doc(db, 'attendance', attId);
        await setDoc(docRef, {
          clockOut: new Date().toISOString()
        }, { merge: true });

        // Activity log
        const logId = `log_${Date.now()}`;
        await setDoc(doc(db, 'activity_logs', logId), {
          id: logId,
          employeeId: emp.id,
          employeeName: emp.name,
          action: 'Attendance Clock-Out',
          details: `Employee clocked-out of shop duty safely at ${new Date().toLocaleTimeString('en-IN')}`,
          timestamp: new Date().toISOString()
        });

        setAuthMsg({ type: 'success', text: `Clock-Out Recorded! Goodbye, ${emp.name}.` });
      }

      setPinInput('');
      fetchStaffData();
      setTimeout(() => setAuthMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setAuthMsg({ type: 'error', text: 'Failed to record attendance: ' + err.message });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
      {/* LEFT COLUMN: ONBOARDING & LISTS (8/12) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Quick controls bar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-neutral-100 shadow-3xs">
          <div>
            <h3 className="text-sm font-black text-neutral-900 uppercase tracking-tight">Staffing control Center</h3>
            <p className="text-[10px] text-neutral-400 mt-0.5">Manage credentials, cashier PIN registers, and security privileges.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-neutral-950 hover:bg-neutral-800 text-white px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            Onboard New Cashier / Staff
          </button>
        </div>

        {/* Onboard form */}
        {showForm && (
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h4 className="text-xs font-black uppercase text-neutral-950 tracking-wider">Garment Staff Intake profile</h4>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-950">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Employee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sivasankar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="siva@garments.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="9442109231"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Security role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs bg-white font-bold"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">quick Login PIN (4 Digits) *</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="e.g. 1234"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs text-center font-black tracking-widest bg-orange-50/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold uppercase text-neutral-500">Cancel</button>
                <button type="submit" className="bg-neutral-950 text-white font-black text-xs uppercase px-6 py-2 rounded-lg">Save Profile</button>
              </div>
            </form>
          </div>
        )}

        {/* Employee directory profiles */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-neutral-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-white py-16 text-center border rounded-2xl">
            <Users className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-xs font-black text-neutral-500 uppercase">No Employee Staff Registered</p>
            <p className="text-[10px] text-neutral-400 mt-1">Onboard cashiers to configure their lock screens and tracking.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-3xs overflow-hidden">
            <div className="p-4 border-b bg-neutral-50/50 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Store Staff Directory ({employees.length} employees)</span>
              <button 
                onClick={fetchStaffData}
                className="text-orange-600 hover:text-orange-700 text-[10px] font-black uppercase flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Sync Staff
              </button>
            </div>

            <div className="overflow-x-auto text-xs text-left">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-100/40 border-b font-black text-neutral-400 text-[9px] uppercase">
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3 text-center">Auth Role</th>
                    <th className="p-3 text-center">Cashier PIN</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700">
                  {employees.map(e => (
                    <tr key={e.id} className="hover:bg-neutral-50/40">
                      <td className="p-3 font-bold text-neutral-900">{e.name}</td>
                      <td className="p-3">{e.email}</td>
                      <td className="p-3">{e.phone || 'N/A'}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          e.role === 'Admin' ? 'bg-red-50 text-red-700 border border-red-100' : e.role === 'Manager' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {e.role}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-neutral-400">••••</td>
                      <td className="p-3 text-center">
                        <span className="text-[9px] bg-emerald-50 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase">
                          {e.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleDeleteEmployee(e.id, e.name)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Daily Attendance Clock records */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-3xs overflow-hidden">
          <div className="p-4 border-b bg-neutral-50/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block text-left">Daily Attendance Register Card</span>
          </div>

          <div className="overflow-x-auto text-xs text-left max-h-60 overflow-y-auto">
            {attendance.length === 0 ? (
              <p className="py-12 text-center text-neutral-400 uppercase font-black text-[9px]">No attendance logged for today.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-100/40 border-b font-black text-neutral-400 text-[9px] uppercase">
                    <th className="p-3">Clock Date</th>
                    <th className="p-3">Staff name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-center">In Time</th>
                    <th className="p-3 text-center">Out Time</th>
                    <th className="p-3 text-center">Register Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-600">
                  {attendance.map(att => (
                    <tr key={att.id}>
                      <td className="p-3 font-mono text-[10px]">{att.date}</td>
                      <td className="p-3 font-bold text-neutral-900">{att.employeeName}</td>
                      <td className="p-3 uppercase text-[9px] text-neutral-500">{att.role}</td>
                      <td className="p-3 text-center font-mono text-[10px] text-emerald-600 font-bold">
                        {new Date(att.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 text-center font-mono text-[10px] text-red-500 font-bold">
                        {att.clockOut ? new Date(att.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'On Duty'}
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-[9px] bg-emerald-50 text-emerald-800 font-black px-2 py-0.5 rounded-full">
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: QUICK ATTENDANCE PIN CLOCK (4/12) & LOGS */}
      <div className="lg:col-span-4 space-y-6">
        {/* Attendance Pin login box */}
        <div className="bg-neutral-950 text-white p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500 animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Staff Attendance Clock-Terminal</h4>
          </div>
          <p className="text-[10px] text-neutral-400">Cashiers must input their assigned security login PIN to punch shift attendance.</p>

          <div className="space-y-4">
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full py-3.5 px-4 rounded-xl text-center font-black tracking-widest text-lg bg-neutral-900 text-amber-400 focus:outline-none border border-neutral-800"
            />

            {authMsg && (
              <div className={`p-3 rounded-lg text-[10px] font-bold text-center ${
                authMsg.type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900' : 'bg-red-950/80 text-red-400 border border-red-900'
              }`}>
                {authMsg.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickClock('IN')}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1 shadow-md transition-all"
              >
                <LogIn className="w-4 h-4" />
                Clock In
              </button>
              <button
                onClick={() => handleQuickClock('OUT')}
                className="py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1 shadow-md transition-all"
              >
                <LogOut className="w-4 h-4" />
                Clock Out
              </button>
            </div>
          </div>
        </div>

        {/* Live scrolling System activity Audit logs */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <FileText className="w-4 h-4 text-orange-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950">System Operations Audit Log</h4>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 text-left font-sans">
            {logs.length === 0 ? (
              <p className="text-center py-12 text-neutral-400 text-xs font-semibold">No operations logged yet.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-black text-[10px] text-neutral-900">{log.employeeName}</span>
                    <span className="text-[8px] text-neutral-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wide block leading-none">{log.action}</span>
                  <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
